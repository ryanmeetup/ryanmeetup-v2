import "server-only";

import type { User } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/server/admin-client";
import { authorize, type Authorization } from "@/lib/server/auth";
import { apiError } from "@/lib/server/api-response";

export { apiError } from "@/lib/server/api-response";
export { readJson } from "@/lib/server/request";

type ApiFailure = { response: ReturnType<typeof apiError> };
export type PrivilegedContext = Authorization & {
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

export async function recordWorkspaceActivity(
  actor: User,
  event: {
    action: string;
    targetType: string;
    targetId?: string | null;
    name: string;
    href?: string;
    projectId?: string | null;
    coalesceSeconds?: number;
    metadata?: Record<string, unknown>;
  },
) {
  const admin = getAdminClient();
  if (!admin) return false;
  if (event.coalesceSeconds && event.targetId) {
    const cutoff = new Date(
      Date.now() - event.coalesceSeconds * 1000,
    ).toISOString();
    const recent = await admin
      .from("permission_audit_events")
      .select("id")
      .eq("actor_id", actor.id)
      .eq("action", event.action)
      .eq("target_type", event.targetType)
      .eq("target_id", event.targetId)
      .gte("created_at", cutoff)
      .limit(1);
    if (recent.error) return false;
    if (recent.data?.length) return true;
  }
  const { error } = await admin.from("permission_audit_events").insert({
    actor_id: actor.id,
    action: event.action,
    target_type: event.targetType,
    target_id: event.targetId ?? null,
    before_state: null,
    after_state: {
      ...event.metadata,
      activity: true,
      resource_name: event.name,
      resource_href: event.href,
      project_id: event.projectId,
    },
  });
  if (error) {
    console.error("Workspace activity write failed", {
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
