import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/server/admin-client";
import { createClient } from "@/lib/supabase/server";
import { isWorkspaceDemo } from "@/lib/server/workspace-page-loader";
import {
  digestDefaults,
  resolveDigestSettings,
  type DigestSettings,
  type DigestSettingsRow,
} from "@/lib/digest/digest-settings";
import type { DigestRun } from "@/lib/usage/digest-run-types";
import {
  APPLY_MIGRATIONS_HINT,
  isMissingRelation,
} from "@/lib/server/supabase-errors";

export type { DigestRun };

export const DIGEST_SETTINGS_COLUMNS = [
  "enabled",
  "weekdays",
  "send_hour",
  "time_zone",
  "review_minutes",
  "upcoming_days",
  "recent_days",
  "sections",
  "max_recipients",
].join(",");

/**
 * Stored cadence, or `null` when the table has not been created yet.
 * Missing-relation is tolerated on purpose so the worker keeps sending on its
 * built-in defaults in the window between deploying this code and applying
 * the migration that creates the table, matching how `instance_settings`
 * behaves. Every other failure propagates.
 */
export async function readDigestSettings(
  client: Pick<SupabaseClient, "from">,
): Promise<DigestSettings> {
  const { data, error } = await client
    .from("digest_settings")
    .select(DIGEST_SETTINGS_COLUMNS)
    .maybeSingle<DigestSettingsRow>();
  if (error) {
    if (isMissingRelation(error.code)) {
      console.warn(
        `digest_settings is missing; the worker is using built-in cadence defaults. ${APPLY_MIGRATIONS_HINT}`,
      );
      return { ...digestDefaults, sections: [...digestDefaults.sections] };
    }
    throw new Error(`Digest settings could not be loaded: ${error.message}`);
  }
  return resolveDigestSettings(data);
}

/** Resolved cadence for this request, deduplicated across the page tree. */
export const getDigestSettings = cache(async (): Promise<DigestSettings> => {
  if (isWorkspaceDemo())
    return { ...digestDefaults, sections: [...digestDefaults.sections] };
  return readDigestSettings(await createClient());
});

const runFromRow = (row: Record<string, unknown>): DigestRun => ({
  id: String(row.id),
  ranAt: String(row.ran_at),
  digestDate: (row.digest_date as string | null) ?? null,
  outcome: row.outcome as DigestRun["outcome"],
  source: (row.source as DigestRun["source"]) ?? "cron",
  scheduledCount: Number(row.scheduled_count ?? 0),
  skippedCount: Number(row.skipped_count ?? 0),
  failedCount: Number(row.failed_count ?? 0),
  deliverAt: (row.deliver_at as string | null) ?? null,
  detail: (row.detail as string | null) ?? null,
});

/**
 * The recent run ledger. An unreadable or absent ledger is reported as empty
 * rather than failing the Usage page: it is a diagnostic surface, and losing it
 * must not take the quota panels down with it.
 */
export const getDigestRuns = cache(async (limit = 14): Promise<DigestRun[]> => {
  if (isWorkspaceDemo()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("digest_runs")
    .select(
      "id,ran_at,digest_date,outcome,source,scheduled_count,skipped_count,failed_count,deliver_at,detail",
    )
    .order("ran_at", { ascending: false })
    .limit(limit);
  if (error || !data) {
    if (error && !isMissingRelation(error.code))
      console.error("[digest-runs.read]", error.message);
    return [];
  }
  return (data as Record<string, unknown>[]).map(runFromRow);
});

/** Runs older than this are pruned opportunistically by the worker. */
const RUN_RETENTION_DAYS = 90;

export type DigestRunRecord = {
  outcome: DigestRun["outcome"];
  source: DigestRun["source"];
  digestDate?: string | null;
  timeZone?: string | null;
  scheduledCount?: number;
  skippedCount?: number;
  failedCount?: number;
  deliverAt?: string | null;
  detail?: string | null;
};

/**
 * Append one run to the ledger. This is the only record that a run happened,
 * so a write failure is logged loudly but never fails the run itself — the
 * emails have already been created in Resend by the time it is called.
 */
export async function recordDigestRun(record: DigestRunRecord) {
  const admin = getAdminClient();
  if (!admin) return false;
  const { error } = await admin.from("digest_runs").insert({
    outcome: record.outcome,
    source: record.source,
    digest_date: record.digestDate ?? null,
    time_zone: record.timeZone ?? null,
    scheduled_count: record.scheduledCount ?? 0,
    skipped_count: record.skippedCount ?? 0,
    failed_count: record.failedCount ?? 0,
    deliver_at: record.deliverAt ?? null,
    detail: record.detail ?? null,
  });
  if (error) {
    if (!isMissingRelation(error.code))
      console.error("[digest-runs.write]", error.message);
    return false;
  }
  if (Math.random() < 0.05) {
    // Opportunistic pruning: one run in twenty trims the tail, which keeps the
    // ledger bounded without a second scheduled job.
    await admin
      .from("digest_runs")
      .delete()
      .lt(
        "ran_at",
        new Date(
          Date.now() - RUN_RETENTION_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString(),
      );
  }
  return true;
}

/**
 * Whether a run already created messages for `digestDate`. The worker runs
 * hourly, so this is what stops a same-day retry, a manual send followed by the
 * scheduled slot, or a clock that lands twice in one hour from sending twice.
 */
export async function digestAlreadySent(digestDate: string) {
  const admin = getAdminClient();
  if (!admin) return false;
  const { data, error } = await admin
    .from("digest_runs")
    .select("id")
    .eq("digest_date", digestDate)
    .eq("outcome", "sent")
    .limit(1);
  if (error) return false;
  return Boolean(data?.length);
}
