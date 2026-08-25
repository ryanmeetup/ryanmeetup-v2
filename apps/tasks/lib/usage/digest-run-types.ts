export type DigestRunOutcome =
  | "sent"
  | "empty"
  | "off_schedule"
  | "paused"
  | "unconfigured"
  | "failed";

/** One row of the delivery ledger, as the Usage page renders it. */
export type DigestRun = {
  id: string;
  ranAt: string;
  digestDate: string | null;
  outcome: DigestRunOutcome;
  source: "cron" | "manual";
  scheduledCount: number;
  skippedCount: number;
  failedCount: number;
  deliverAt: string | null;
  detail: string | null;
};

export type DigestRunResult = {
  outcome: DigestRunOutcome;
  digestDate: string;
  scheduled: number;
  skipped: number;
  failed: number;
  deliverAt: string | null;
  detail: string | null;
  recorded: boolean;
};

export const DIGEST_OUTCOME_LABEL: Record<DigestRunOutcome, string> = {
  sent: "Sent",
  empty: "Nothing to send",
  off_schedule: "Skipped",
  paused: "Paused",
  unconfigured: "Not configured",
  failed: "Failed",
};
