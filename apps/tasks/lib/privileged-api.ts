import "server-only";

import {
  createClient as createAdminClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { tasksAppOrigin } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";

const MAX_JSON_BYTES = 16 * 1024;

export type ApiSchema<T> = (value: unknown) => T | null;
type ApiFailure = { response: NextResponse };
type Authorization = { user: User; supabase: SupabaseClient };
type PrivilegedContext = Authorization & {
  admin: NonNullable<ReturnType<typeof getAdminClient>>;
};

type ErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "INVALID_JSON"
  | "INVALID_REQUEST"
  | "REQUEST_TOO_LARGE"
  | "ORIGIN_REJECTED"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "CONFLICT"
  | "OPERATION_FAILED"
  | "AUDIT_FAILED";

export function apiError(
  status: number,
  code: ErrorCode,
  error: string,
  headers?: HeadersInit,
) {
  return NextResponse.json({ code, error }, { status, headers });
}

function allowedOrigin(request: Request) {
  try {
    return tasksAppOrigin(request);
  } catch {
    return null;
  }
}

function enforceMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = allowedOrigin(request);
  if (!origin || !allowed || origin !== allowed) {
    return apiError(
      403,
      "ORIGIN_REJECTED",
      "This request did not come from the Tasks app.",
    );
  }
  return null;
}

export async function readJson<T>(request: Request, schema: ApiSchema<T>) {
  const originError = enforceMutationOrigin(request);
  if (originError) return { response: originError } as const;

  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") {
    return {
      response: apiError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Send this request as JSON.",
      ),
    } as const;
  }

  const declaredSize = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_JSON_BYTES) {
    return {
      response: apiError(413, "REQUEST_TOO_LARGE", "The request is too large."),
    } as const;
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return {
      response: apiError(400, "INVALID_JSON", "The request body is not valid JSON."),
    } as const;
  }
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
    return {
      response: apiError(413, "REQUEST_TOO_LARGE", "The request is too large."),
    } as const;
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return {
      response: apiError(400, "INVALID_JSON", "The request body is not valid JSON."),
    } as const;
  }
  const data = schema(value);
  if (!data) {
    return {
      response: apiError(400, "INVALID_REQUEST", "The request fields are not valid."),
    } as const;
  }
  return { data } as const;
}

export async function authorize(
  { owner = false }: { owner?: boolean } = {},
): Promise<ApiFailure | Authorization> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return {
      response: apiError(
        503,
        "SERVICE_UNAVAILABLE",
        "Authentication is temporarily unavailable.",
      ),
    } as const;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return {
      response: apiError(401, "AUTH_REQUIRED", "Sign in to continue."),
    } as const;
  }
  if (owner) {
    const { data: isOwner, error: ownerError } = await supabase.rpc("is_app_owner");
    if (ownerError || !isOwner) {
      return {
        response: apiError(403, "FORBIDDEN", "You do not have permission to do that."),
      } as const;
    }
  }
  return { user: data.user, supabase } as const;
}

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function privilegedContext(
  options: { owner?: boolean } = {},
): Promise<ApiFailure | PrivilegedContext> {
  const authorization = await authorize(options);
  if ("response" in authorization) return authorization;
  const admin = getAdminClient();
  if (!admin) {
    return {
      response: apiError(
        503,
        "SERVICE_UNAVAILABLE",
        "This action is temporarily unavailable.",
      ),
    } as const;
  }
  return {
    user: authorization.user,
    supabase: authorization.supabase,
    admin,
  } as const;
}

export async function auditPrivilegedAction(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  actor: User,
  event: {
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await admin.rpc("record_privileged_audit_event", {
    requested_actor_id: actor.id,
    requested_action: event.action,
    requested_target_type: event.targetType,
    requested_target_id: event.targetId ?? null,
    requested_metadata: event.metadata ?? {},
  });
  if (error) {
    console.error("Privileged audit write failed", {
      action: event.action,
      actorId: actor.id,
      code: error.code,
    });
    return false;
  }
  return true;
}

export async function consumeInviteLimit(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  actorId: string,
) {
  const { data, error } = await admin.rpc("consume_privileged_rate_limit", {
    requested_key: `team-invite:${actorId}`,
    requested_limit: 5,
    requested_window_seconds: 3600,
  });
  if (error) {
    console.error("Invite rate limit check failed", { actorId, code: error.code });
    return null;
  }
  return Boolean(data);
}
