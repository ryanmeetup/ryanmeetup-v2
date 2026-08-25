# Task email system

## Weekday workload digest

Tasks sends at most one workload digest per assignee per day. Each message
groups that person's active work into sections — overdue, due today, due inside
the upcoming window, high or urgent priority without a deadline, and recently
updated. Completed, archived, unassigned, distant, and routine unscheduled
tasks do not consume inbox space. A recipient with nothing in any enabled
section is skipped rather than emailed an empty rundown.

## Where the schedule lives

The cadence is a database row, not a deployment setting. `vercel.json` runs the
worker **every hour**; `digest_settings` decides which of those hours is a send
slot. Owners change days, hour, timezone, review window, and per-run recipient
ceiling from the digest card on `/admin/usage`, and the change applies to the
next hourly run with no redeploy.

`digest_settings` is a singleton row:

| Column | Meaning |
| --- | --- |
| `enabled` | Pause every digest without losing the schedule. |
| `weekdays` | Send days as `Date.getDay()` indexes, `0` = Sunday. |
| `send_hour` | Hour of the day, in `time_zone`, messages are created. |
| `time_zone` | The zone both the schedule and date classification use. |
| `review_minutes` | Delay between creating a message in Resend and delivery. |
| `upcoming_days` | How far ahead "Coming up" reaches. |
| `recent_days` | How far back "Recently updated" looks. |
| `sections` | Enabled sections, in render order. |
| `max_recipients` | Ceiling on messages created per run. |

A send slot is a whole hour, so a run that is retried or arrives late within
the same hour still matches. Off-schedule hours read one row and return.

## Why nothing sending used to be invisible

The worker reported its counts in a `200` response body that nothing read, so a
run that silently stopped happening — or one that ran and failed every send —
looked exactly like a quiet day. `digest_runs` is the fix: every run that makes
a decision appends a row with its outcome (`sent`, `empty`, `paused`,
`unconfigured`, `failed`), its counts, and the failure detail. The digest run
ledger on `/admin/usage` renders it. Off-schedule hours are deliberately *not*
recorded; 23 no-ops a day would bury the runs that mean something.

Rows older than 90 days are pruned opportunistically by the worker, so the
ledger stays bounded without a second scheduled job.

## Duplicate protection

Three independent guards, because a digest arriving twice is worse than one
arriving late:

- `digest_runs` is checked for a `sent` outcome on the same workspace-local
  date before any message is created.
- Resend receives an idempotency key of `task-digest/<profile>/<date>`, valid
  for 24 hours, so a retry that gets past the ledger still cannot duplicate.
- "Send now" on the Usage page bypasses the schedule check but not the
  once-per-day guard.

## Review window

Each message is created in Resend with `scheduled_at` set `review_minutes` in
the future. Until then a workspace owner can preview, delay, or cancel it from
the recent email activity table on `/admin/usage`.

## Quota

The per-run recipient ceiling defaults to 90, keeping a full run inside the
Resend free tier's 100-messages-a-day limit. Sending on weekdays only keeps
even 90 non-empty recipients per run below 3,000 messages a month. Resend
counts every To, CC, and BCC recipient toward quota.

## Deployment requirements

`RESEND_API_KEY`, `CRON_SECRET`, and a verified sender in
`TASK_DIGEST_FROM_EMAIL` — `TASK_REMINDER_FROM_EMAIL` or `RESEND_FROM_EMAIL`
are also accepted, for compatibility. The Tasks app URL and the Supabase admin
credentials are required by the worker.

**Vercel Deployment Protection.** Cron jobs invoke the deployment's generated
`*.vercel.app` host, not the custom domain. If Vercel Authentication is enabled
for generated deployment URLs, that request can be intercepted before it
reaches the route, and the worker never runs — with no application-side symptom
to find, because nothing executes. Confirm the run ledger shows recent runs
after changing any protection setting. This is what stopped digests on
2026-08-24; see [INCIDENTS.md](INCIDENTS.md).

## Deliberately deferred

Before the workspace grows beyond one operating timezone, add profile-level
timezone and digest preference fields; the cadence is currently per workspace,
not per person. Individual task emails remain out of scope because they provide
less context per message and compete with the digest for quota.
