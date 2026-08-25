import "server-only";

import type { User } from "@supabase/supabase-js";
import type { TaskChange } from "@/lib/activity/task-change-summary";
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

/**
 * Attaches the field-level diff of a save to the activity record the
 * `save_task` transaction wrote, so history reads as the fields that changed
 * rather than an unqualified "updated the task". The content write has already
 * succeeded and been audited by this point: a failure here degrades the record
 * to its generic form and must never fail the save.
 */
export async function recordTaskChangeActivity(
  taskId: string,
  changes: TaskChange[],
) {
  if (!changes.length) return false;
  const admin = getAdminClient();
  if (!admin) return false;
  const recent = await admin
    .from("task_activity")
    .select("id,details")
    .eq("task_id", taskId)
    .eq("action", "updated the task")
    .gte("created_at", new Date(Date.now() - 60_000).toISOString())
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  // No row means the save recorded no update event; never describe an older one.
  if (recent.error || !recent.data) return false;
  const details = (recent.data.details ?? {}) as Record<string, unknown>;
  if (Array.isArray(details.changes)) return false;
  const { error } = await admin
    .from("task_activity")
    .update({ details: { ...details, changes } })
    .eq("id", recent.data.id);
  if (error) {
    console.error("Task change activity write failed", {
      taskId,
      code: error.code,
    });
    return false;
  }
  return true;
}
