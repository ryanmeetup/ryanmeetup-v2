import { NextResponse } from "next/server";
import { apiError, databaseFailure } from "@/lib/server/api-response";
import { getAdminClient } from "@/lib/server/admin-client";
import { sendTaskDigestEmail } from "@/lib/server/task-digest-email";
import { getInstanceSettings } from "@/lib/server/instance-settings";
import { buildTaskDigest, taskDigestCount } from "@/lib/tasks/task-digest";

export const runtime = "nodejs";

const DAILY_RECIPIENT_CAP = 90;
const DEFAULT_REVIEW_MINUTES = 30;
const digestDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function currentDigestDate() {
  const parts = new Map(
    digestDateFormatter
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`;
}

function reviewMinutes() {
  const configured = Number(process.env.TASK_DIGEST_REVIEW_MINUTES);
  return Number.isInteger(configured) && configured >= 5 && configured <= 1440
    ? configured
    : DEFAULT_REVIEW_MINUTES;
}

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const from =
    process.env.TASK_DIGEST_FROM_EMAIL ??
    process.env.TASK_REMINDER_FROM_EMAIL ??
    process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from)
    return apiError(
      503,
      "SERVICE_UNAVAILABLE",
      "Task digests are unavailable.",
    );

  const admin = getAdminClient();
  if (!admin)
    return apiError(
      503,
      "SERVICE_UNAVAILABLE",
      "Task digests are unavailable.",
    );

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
  if (taskResult.error || profileResult.error)
    return databaseFailure(
      request,
      "task-digests.list",
      taskResult.error ?? profileResult.error!,
      { error: "Task digests could not be processed." },
    );

  // Resolved once: every digest in this run shares the same branding.
  const instance = await getInstanceSettings();
  const digestDate = currentDigestDate();
  const scheduledAt = new Date(
    Date.now() + reviewMinutes() * 60 * 1000,
  ).toISOString();
  let scheduled = 0;
  let skipped = 0;
  let failed = 0;
  let attempted = 0;
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
    );
    if (!taskDigestCount(digest)) {
      skipped += 1;
      continue;
    }
    if (attempted >= DAILY_RECIPIENT_CAP) break;
    attempted += 1;
    const user = await admin.auth.admin.getUserById(profile.id);
    if (!user.data.user?.email) {
      failed += 1;
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
        scheduledAt,
      });
      scheduled += 1;
    } catch (error) {
      console.error("[task-digests.send]", {
        profileId: profile.id,
        message: error instanceof Error ? error.message : "Unknown send error",
      });
      failed += 1;
    }
  }

  return NextResponse.json({ scheduled, scheduledAt, skipped, failed });
}
