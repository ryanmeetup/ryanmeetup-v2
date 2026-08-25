import { NextResponse } from "next/server";
import { digestSettingsSchema } from "@/lib/api-schema";
import { databaseFailure } from "@/lib/server/api-response";
import {
  apiError,
  auditPrivilegedAction,
  privilegedContext,
  readJson,
} from "@/lib/server/privileged-api";
import { DIGEST_SETTINGS_COLUMNS } from "@/lib/server/digest-settings";
import { isMissingRelation } from "@/lib/server/supabase-errors";
import {
  resolveDigestSettings,
  type DigestSettingsRow,
} from "@/lib/digest/digest-settings";

/** camelCase request field to `digest_settings` column. */
const columnFor: Record<string, string> = {
  enabled: "enabled",
  weekdays: "weekdays",
  sendHour: "send_hour",
  timeZone: "time_zone",
  reviewMinutes: "review_minutes",
  upcomingDays: "upcoming_days",
  recentDays: "recent_days",
  sections: "sections",
  maxRecipients: "max_recipients",
};

/**
 * Update the singleton cadence row. The worker reads this on every run, so a
 * saved change takes effect at the next hourly invocation with no redeploy.
 */
export async function PATCH(request: Request) {
  const parsed = await readJson(request, digestSettingsSchema);
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;

  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data))
    row[columnFor[key]] = value;

  const { data, error } = await context.admin
    .from("digest_settings")
    // `id` is the singleton primary key, so this upsert always targets the one row.
    .upsert({
      ...row,
      id: true,
      updated_at: new Date().toISOString(),
      updated_by: context.user.id,
    })
    .select(DIGEST_SETTINGS_COLUMNS)
    .single<DigestSettingsRow>();
  // A pending migration is the one failure an owner can act on, so it is named
  // rather than folded into the generic "try again" message.
  if (error && isMissingRelation(error.code))
    return apiError(
      503,
      "SERVICE_UNAVAILABLE",
      "The digest_settings table does not exist yet. Apply the pending migration in apps/tasks/supabase/migrations, then save again.",
    );
  if (error || !data) {
    return databaseFailure(
      request,
      "digest-settings.update",
      error ?? { message: "Digest settings upsert returned no row." },
      { error: "The digest settings could not be saved. Try again." },
    );
  }

  if (
    !(await auditPrivilegedAction(context.admin, context.user, {
      action: "digest-settings.update",
      targetType: "digest_settings",
      metadata: { fields: Object.keys(parsed.data) },
    }))
  )
    return apiError(
      500,
      "AUDIT_FAILED",
      "The digest settings were saved, but the audit record could not be written.",
    );

  return NextResponse.json({ settings: resolveDigestSettings(data) });
}
