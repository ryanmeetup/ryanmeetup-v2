import "server-only";

import type { User } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/server/admin-client";
import { authorize, type Authorization } from "@/lib/server/auth";
import { apiError } from "@/lib/server/api-response";

export { apiError } from "@/lib/server/api-response";
export { readJson } from "@/lib/server/request";

type ApiFailure = { response: ReturnType<typeof apiError> };
type PrivilegedContext = Authorization & {
  admin: NonNullable<ReturnType<typeof getAdminClient>>;
};

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
    console.error("Invite rate limit check failed", {
      actorId,
      code: error.code,
    });
    return null;
  }
  return Boolean(data);
}
