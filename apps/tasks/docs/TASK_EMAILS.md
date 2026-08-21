# Task email system

## Weekday workload digest

Tasks sends at most one weekday digest per assignee. Each message groups active
work into overdue, due today, due in the next three days, and high or urgent
priority tasks without a deadline. Completed, archived, unassigned, distant,
and routine unscheduled tasks do not consume inbox space. Empty digests are
skipped.

The Vercel worker runs at 13:00 UTC Monday through Friday. It creates each
message in Resend with a 30-minute review window before delivery, allowing a
workspace owner to preview, delay, or cancel it from the Usage page. Set
`TASK_DIGEST_REVIEW_MINUTES` to an integer from 5 through 1,440 to change that
window. Dates are classified in `America/New_York`, the workspace's current
operating timezone. Resend uses an idempotency key made from the recipient and
digest date, so retries on the same day do not create duplicate messages.

The worker considers no more than 90 recipients per run, keeping it below the
100-email daily free-tier limit. Because it runs only on weekdays, even 90
non-empty recipients per run remain below 3,000 messages per month. Current
workspace membership is much smaller, and recipients without actionable work
are skipped.

The deployment needs `RESEND_API_KEY`, `CRON_SECRET`, and a verified sender in
`TASK_DIGEST_FROM_EMAIL`. For compatibility, the existing
`TASK_REMINDER_FROM_EMAIL` or `RESEND_FROM_EMAIL` is also accepted. Existing
Tasks app URL and Supabase admin credentials are required by the worker.

## Deliberately deferred

Before the workspace grows beyond one operating timezone, add profile-level
timezone and digest preference fields. A future owner dashboard can add a
persistent delivery ledger for longer-term reporting, monthly-budget
visibility, and explicit pause controls. Individual task emails remain out of
scope because they provide less context per message and compete with the digest
for quota.
