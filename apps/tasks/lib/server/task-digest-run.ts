import "server-only";

import { getAdminClient } from "@/lib/server/admin-client";
import { getInstanceSettings } from "@/lib/server/instance-settings";
import { sendTaskDigestEmail } from "@/lib/server/task-digest-email";
import {
  digestAlreadySent,
  recordDigestRun,
  readDigestSettings,
} from "@/lib/server/digest-settings";
import {
  digestDateFor,
  isDigestSlot,
  type DigestSettings,
} from "@/lib/digest/digest-settings";
import { buildTaskDigest, taskDigestCount } from "@/lib/tasks/task-digest";

export type DigestRunOutcome =
  | "sent"
  | "empty"
  | "off_schedule"
  | "paused"
  | "unconfigured"
  | "failed";

export type DigestRunResult = {
  outcome: DigestRunOutcome;
  digestDate: string;
  scheduled: number;
  skipped: number;
  failed: number;
  deliverAt: string | null;
  detail: string | null;
  /** Whether this result was appended to the ledger. */
  recorded: boolean;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const senderAddress = () =>
  process.env.TASK_DIGEST_FROM_EMAIL ??
  process.env.TASK_REMINDER_FROM_EMAIL ??
  process.env.RESEND_FROM_EMAIL;

/**
 * Create this run's digest messages in Resend.
 *
 * The worker is invoked hourly and this function owns the decision of whether
 * the current hour is a send slot, so the cadence lives in `digest_settings`
 * rather than in `vercel.json`. `source: "manual"` bypasses the slot check but
 * not the once-per-day guard, so an owner pressing "Send now" cannot duplicate
 * a digest the scheduled run already created.
 *
 * Off-schedule hours return without touching the ledger: recording 23 no-ops a
 * day would bury the runs that actually mean something.
 */
export async function runTaskDigest({
  source,
  now = new Date(),
}: {
  source: "cron" | "manual";
  now?: Date;
}): Promise<DigestRunResult> {
  const admin = getAdminClient();
  const empty = (
    outcome: DigestRunOutcome,
    digestDate: string,
    detail: string | null = null,
  ): DigestRunResult => ({
    outcome,
    digestDate,
    scheduled: 0,
    skipped: 0,
    failed: 0,
    deliverAt: null,
    detail,
    recorded: false,
  });

  if (!admin)
    return empty(
      "unconfigured",
      now.toISOString().slice(0, 10),
      "Supabase admin credentials are missing.",
    );

  let settings: DigestSettings;
  try {
    settings = await readDigestSettings(admin);
  } catch (error) {
    const digestDate = now.toISOString().slice(0, 10);
    const detail =
      error instanceof Error ? error.message : "Digest settings unreadable.";
    await recordDigestRun({ outcome: "failed", source, digestDate, detail });
    return { ...empty("failed", digestDate, detail), recorded: true };
  }

  const digestDate = digestDateFor(settings, now);

  if (!settings.enabled) {
    // A paused workspace records once per attempt so the ledger explains the
    // silence, but only when the hour would otherwise have sent.
    if (source === "cron" && !isDigestSlot({ ...settings, enabled: true }, now))
      return empty("off_schedule", digestDate);
    await recordDigestRun({
      outcome: "paused",
      source,
      digestDate,
      timeZone: settings.timeZone,
      detail: "Digests are paused.",
    });
    return { ...empty("paused", digestDate, "Digests are paused."), recorded: true };
  }

  if (source === "cron" && !isDigestSlot(settings, now))
    return empty("off_schedule", digestDate);

  if (await digestAlreadySent(digestDate))
    return empty(
      "off_schedule",
      digestDate,
      "A digest was already sent for this date.",
    );

  const from = senderAddress();
  if (!process.env.RESEND_API_KEY || !from) {
    const detail = "RESEND_API_KEY or a verified sender address is missing.";
    await recordDigestRun({
      outcome: "unconfigured",
      source,
      digestDate,
      timeZone: settings.timeZone,
      detail,
    });
    return { ...empty("unconfigured", digestDate, detail), recorded: true };
  }

  const [taskResult, profileResult] = await Promise.all([
    admin
      .from("tasks")
      .select(
        "id,task_number,title,description,due_date,due_time,priority,updated_at,assignee_id,project:projects(name),status:statuses(name,color)",
      )
      .is("completed_at", null)
      .is("archived_at", null)
      .not("assignee_id", "is", null),
    admin.from("profiles").select("id,full_name").order("full_name"),
  ]);
  if (taskResult.error || profileResult.error) {
    const detail = (taskResult.error ?? profileResult.error)!.message;
    await recordDigestRun({
      outcome: "failed",
      source,
      digestDate,
      timeZone: settings.timeZone,
      detail,
    });
    return { ...empty("failed", digestDate, detail), recorded: true };
  }

  // Resolved once: every digest in this run shares the same branding.
  const instance = await getInstanceSettings();
  const deliverAt = new Date(
    now.getTime() + settings.reviewMinutes * 60 * 1000,
  ).toISOString();

  let scheduled = 0;
  let skipped = 0;
  let failed = 0;
  let attempted = 0;
  let lastError: string | null = null;
  for (const profile of profileResult.data ?? []) {
    const digest = buildTaskDigest(
      (taskResult.data ?? [])
        .filter((task) => task.assignee_id === profile.id)
        .map((task) => ({
          ...task,
          project: firstRelation(task.project),
          status: firstRelation(task.status),
        })),
      digestDate,
      settings,
      now,
    );
    if (!taskDigestCount(digest)) {
      skipped += 1;
      continue;
    }
    if (attempted >= settings.maxRecipients) break;
    attempted += 1;
    const user = await admin.auth.admin.getUserById(profile.id);
    if (!user.data.user?.email) {
      failed += 1;
      lastError = `No email address for ${profile.full_name}.`;
      continue;
    }
    try {
      await sendTaskDigestEmail({
        digest,
        instance,
        digestDate,
        profileId: profile.id,
        recipientName: profile.full_name,
        to: user.data.user.email,
        scheduledAt: deliverAt,
        timeZone: settings.timeZone,
      });
      scheduled += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown send error";
      console.error("[task-digests.send]", {
        profileId: profile.id,
        message,
      });
      lastError = message;
      failed += 1;
    }
  }

  // "empty" and "failed" are distinct from "sent" so the ledger answers the
  // only question that matters when nothing arrived: was there nothing to
  // send, or did sending break?
  const outcome: DigestRunOutcome =
    scheduled > 0 ? "sent" : failed > 0 ? "failed" : "empty";
  const detail =
    outcome === "failed"
      ? lastError
      : outcome === "empty"
        ? "No assignee had actionable work."
        : null;
  const recorded = await recordDigestRun({
    outcome,
    source,
    digestDate,
    timeZone: settings.timeZone,
    scheduledCount: scheduled,
    skippedCount: skipped,
    failedCount: failed,
    deliverAt: scheduled > 0 ? deliverAt : null,
    detail,
  });

  return {
    outcome,
    digestDate,
    scheduled,
    skipped,
    failed,
    deliverAt: scheduled > 0 ? deliverAt : null,
    detail,
    recorded,
  };
}
