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
 *
 * The row is named by `save_task` itself. Matching on recency instead, as this
 * once did, attaches a diff to the wrong save when two land within a minute,
 * and finds nothing at all when the save also changed the task's status.
 */
export async function recordTaskChangeActivity(
  activityId: string | null,
  changes: TaskChange[],
) {
  if (!activityId || !changes.length) return false;
  const admin = getAdminClient();
  if (!admin) return false;
  const recorded = await admin
    .from("task_activity")
    .select("id,details")
    .eq("id", activityId)
    .maybeSingle();
  if (recorded.error || !recorded.data) return false;
  const details = (recorded.data.details ?? {}) as Record<string, unknown>;
  const { error } = await admin
    .from("task_activity")
    .update({ details: { ...details, changes } })
    .eq("id", activityId);
  if (error) {
    console.error("Task change activity write failed", {
      activityId,
      code: error.code,
    });
    return false;
  }
  return true;
}

/**
 * Records a privileged action in the workspace feed.
 *
 * `auditPrivilegedAction` writes the compliance trail, which only app owners
 * read. This is the other half: the things a teammate needs an explanation for
 * -- a status renamed out from under every board, a project going restricted,
 * someone appearing in or vanishing from the assignee list. Like the audit
 * write it never throws; unlike it, a failure is not worth failing a request
 * that has already succeeded, so it only logs.
 */
export async function recordWorkspaceActivity(
  admin: NonNullable<ReturnType<typeof getAdminClient>>,
  actor: User,
  event: {
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await admin.rpc("record_workspace_activity_event", {
    requested_actor_id: actor.id,
    requested_action: event.action,
    requested_target_type: event.targetType,
    requested_target_id: event.targetId ?? null,
    requested_metadata: event.metadata ?? {},
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
