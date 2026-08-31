import { NextResponse } from "next/server";
import { runTaskDigest } from "@/lib/server/task-digest-run";
import {
  apiError,
  auditPrivilegedAction,
  privilegedContext,
  recordWorkspaceActivity,
} from "@/lib/server/privileged-api";

export const runtime = "nodejs";

/**
 * Owner-triggered digest run. It skips the schedule check but not the
 * once-per-day guard, so pressing "Send now" cannot duplicate a digest the
 * scheduled slot already created.
 */
export async function POST() {
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;

  const result = await runTaskDigest({ source: "manual" });

  if (
    !(await auditPrivilegedAction(context.admin, context.user, {
      action: "task-digests.run",
      targetType: "digest_runs",
      metadata: {
        outcome: result.outcome,
        scheduled: result.scheduled,
        digestDate: result.digestDate,
      },
    }))
  )
    return apiError(
      500,
      "AUDIT_FAILED",
      "The digest ran, but the audit record could not be written.",
    );

  await recordWorkspaceActivity(context.admin, context.user, {
    action: "digest.run",
    targetType: "workspace",
    metadata: { resource_name: "Task digest", detail: result.outcome },
  });

  return NextResponse.json(result);
}
