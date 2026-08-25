# Incident log

A record of things that broke in production, what actually caused them, and
what we changed so the next person does not have to work it out from scratch.

Newest first.

---

## 2026-08-24 — Digest emails silently stopped

**Status:** Cause identified, not yet confirmed fixed
**Impact:** Two days of workload digests never sent. Nobody was told.

### What happened

The daily workload digest emails stopped going out. No error appeared
anywhere. No alert fired. The problem was noticed only because a person
realised they had not received their morning email.

### Timeline

| When (UTC) | What |
| --- | --- |
| Fri 2026-08-21, 13:00 | Last successful run. Seven digests sent and delivered. |
| Sat 2026-08-22, 22:40 | Production deploy `c0c1850`. |
| Mon 2026-08-24, 13:00 | Scheduled run. **Nothing happened.** |
| Tue 2026-08-25, 13:00 | Scheduled run. **Nothing happened.** |
| Tue 2026-08-25, 15:19 | Noticed and investigated. Digests sent by hand. |

### What we checked

Everything on the application side was healthy. None of it was the problem:

| Checked | Result |
| --- | --- |
| Task and profile data in Supabase | Fine — 40 active tasks, 4 people had work worth emailing |
| Resend API key | Valid |
| Sending domain `ryanmeetup.com` | Verified |
| Scheduled sending through Resend | Works — tested with a probe message, then cancelled it |
| Production environment variables | All present |
| The cron job registration in Vercel | Registered, enabled, pointed at the current deployment |
| The route itself | **Works.** Run by hand it returned "4 scheduled, 0 failed", and all four arrived |

Because the route works when called directly, the code was never the problem.
**The scheduled call was simply never arriving.**

### The likely cause

Vercel cron jobs do not call your custom domain. They call the deployment's
own generated address, which looks like
`tasks-d4p6eaqyj-teamryan.vercel.app`.

That address is protected by Vercel Authentication. Requesting it returns a
redirect to a Vercel login page instead of reaching the app:

- `https://tasks.ryanmeetup.com/api/cron/send-task-digests` → `401` from our
  own code, which is correct and expected
- `https://tasks-d4p6eaqyj-teamryan.vercel.app/api/cron/...` → `302` to
  `vercel.com/sso-api`, meaning **our code never runs**

The project has no Protection Bypass configured, which is the setting that
normally lets automated callers through.

This is the only difference we could find between the working and broken
state, and it explains the total absence of evidence: if the request is turned
away before it reaches the app, the app has nothing to log.

**This is not yet proven.** We cannot watch Vercel's internal cron caller from
outside. Treat it as the leading suspect, and check
**Vercel → Settings → Deployment Protection** first.

### Why nobody noticed for two days

This is the more important lesson.

The worker reported what it had done by returning a JSON body with its counts.
Nothing ever read that body. There was no record anywhere that a run had
happened, or had not.

So all of these looked exactly the same from the outside — an empty inbox:

- The worker ran and sent nothing because nobody had work due
- The worker ran and every send failed
- The worker never ran at all

There was no way to tell them apart without doing the investigation above.

### What we changed

1. **A run ledger.** Every run now writes a row to `digest_runs` recording its
   outcome — `sent`, `empty`, `paused`, `unconfigured`, or `failed` — with
   counts and the failure reason. It is shown on `/admin/usage`. An empty
   inbox is now explainable in a glance.

2. **The schedule moved into the database.** It used to live in `vercel.json`,
   so changing it needed a code change and a deploy. Now the worker runs every
   hour and a `digest_settings` row decides which hours actually send. Days,
   hour, timezone, review window, sections, and their order are all editable
   from `/admin/usage`.

3. **Clearer failures.** A missing database table now returns a message saying
   which migration to apply, instead of a generic "try again".

See [TASK_EMAILS.md](TASK_EMAILS.md) for how the system works now.

### If digests go quiet again

Work through this in order:

1. **Open `/admin/usage` and look at the digest run ledger.**
   - Rows are appearing → the worker is running. Read the outcome column; it
     will say whether there was nothing to send, or whether sending failed.
   - **No rows at all since a given day** → the worker is not being called.
     This is the same failure as this incident. Go to step 2.
2. **Check Vercel → Settings → Deployment Protection.** If Vercel
   Authentication covers generated deployment URLs, the cron call is likely
   being blocked before it reaches the app.
3. **Test the route directly** to confirm the app itself is fine:
   ```
   curl -H "authorization: Bearer $CRON_SECRET" \
     https://tasks.ryanmeetup.com/api/cron/send-task-digests
   ```
   A healthy response looks like `{"outcome":"sent","scheduled":4,...}`.
   Sending by hand is safe: messages wait for the review window before
   delivery, and a second run on the same day will not duplicate anything.

### Still open

- [ ] Apply `supabase/migrations/20260905000000_digest_schedule.sql`. Until
      then the run ledger does not exist and the settings screen cannot save.
      Sending still works on built-in defaults.
- [ ] Deploy, so the hourly schedule takes effect.
- [ ] Confirm the cause. After deploying, if the ledger is still empty past the
      next send hour, the call is still being blocked and the fix is in Vercel,
      not in this codebase.

### Lesson

A scheduled job that reports its results only to whoever called it is a job
that can stop running without telling anyone. If it matters that it ran, it
has to leave a trace that a person can go and look at.

---

## Adding an entry

Add new incidents at the top, under the heading rule. Keep the same shape:
what happened, a timeline, what was ruled out, the cause, why it went
unnoticed, what changed, and how to recognise it next time.

Write it for somebody who was not there.
