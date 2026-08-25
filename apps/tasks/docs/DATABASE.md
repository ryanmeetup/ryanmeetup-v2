# Database, migrations, and the schema baseline

How the Tasks database is described in this repository, how to change it safely,
and how to prove a change is correct before it reaches production.

If you are standing up a second instance, read this first and then
`docs/MULTI_INSTANCE.md`, which covers everything outside the database.

## The short version

- Every schema change is a migration file in `supabase/migrations`, applied with
  `supabase db push`. **Never change the schema only in the dashboard, and never
  delete an applied migration file.**
- `20260731000000_baseline_schema.sql` reproduces the entire database from
  nothing. `supabase/seed.sql` adds the rows a workspace needs to be usable.
- Verify any change with `supabase db reset` followed by
  `supabase db diff --linked`. For this schema that is not a formality — see
  "What verification caught".

## Why the baseline exists

Production's `supabase_migrations.schema_migrations` table records **67 applied
migrations**, from `20260801000000` to `20260904030000`. Not one of their files
was in this repository.

Migrations had always been the practice. The files were being discarded after
they were applied — the same thing that happened to
`20260822000000_instance_settings.sql`, which created a table that exists in
production and whose file no longer exists anywhere.

The consequence was that a second database could not be built from source, and
the first one had no disaster recovery. The baseline is that lost history,
flattened into a single starting point. Everything after it is an ordinary
forward migration.

The 67 orphaned history rows are harmless and can stay. What matters is that
every migration from here forward exists as a committed file.

## What the baseline contains

`supabase/migrations/20260731000000_baseline_schema.sql`, roughly 4,200 lines,
in dependency order:

| Part | Why it needs to be there |
| --- | --- |
| Public schema | 34 tables, 54 functions, 74 policies, 30 triggers, 5 enums, 27 indexes. RLS is enabled on all 34 tables and 38 functions are `security definer` |
| `auth_user_profile` trigger | Fires `public.handle_new_user()` on insert into `auth.users`. **A public-schema dump does not include it.** `app/api/team/route.ts` calls `inviteUserByEmail` and never inserts a profile itself, so without this trigger every invited user silently gets no profile |
| Storage buckets | Six `insert into storage.buckets` rows. Buckets are *data*, so no schema dump carries them |
| Storage policies | 15 policies on `storage.objects`. They call public-schema functions such as `can_view_task`, which is why they come last |
| Grant corrections | Explicit revokes on three privileged tables — see "What verification caught" |

The authorization model lives almost entirely in SQL: `is_app_owner`,
`can_view_task`, `can_edit_project`, `can_access_category`,
`project_permission_for`, `member_has_group_access` and their siblings, plus the
transactional writers `save_task`, `move_task`, `create_status`,
`reorder_statuses`, `save_contact`, and `set_category_access`. A policy missed
during a hand rebuild is a silent data leak rather than a visible error, which
is why the baseline is generated rather than written.

### Storage buckets

| Bucket | Public | Size limit | MIME types |
| --- | --- | --- | --- |
| `profile-avatars` | yes | 5 MB | jpeg, png, webp |
| `instance-assets` | yes | 2 MB | png, jpeg, svg+xml, webp |
| `organization-images` | yes | 5 MB | jpeg, png, webp |
| `task-attachments` | no | 10 MB | pdf, jpeg, png, webp, text/plain |
| `project-attachments` | no | 10 MB | pdf, jpeg, png, webp, text/plain |
| `category-attachments` | no | 10 MB | pdf, jpeg, png, webp, text/plain |

`public` set wrong on any of the three attachment buckets would expose every
uploaded file.

### The seed

`supabase/seed.sql` inserts the six default statuses. A workspace without at
least one status is unusable: the board has no columns and no task can be
created.

| Name | Color | Order | Completes tasks |
| --- | --- | --- | --- |
| Backlog | `#64748b` | 0 | no |
| Todo | `#2563eb` | 1 | no |
| In Progress | `#d97706` | 2 | no |
| In Review | `#7c3aed` | 3 | no |
| Done | `#059669` | 4 | **yes** |
| Will Not Do | `#f51b2b` | 5 | no |

It is guarded with `where not exists (select 1 from public.statuses)` rather
than `on conflict`. The unique constraint on `statuses` is deferrable, and
Postgres rejects a deferrable constraint as an `on conflict` arbiter with
`SQLSTATE 55000`. The guard also makes the seed safe to re-run.

`supabase db reset` runs the seed automatically. That is a **local** command;
never point it at a hosted project. To seed a hosted database, run
`psql "$DB_URL" -f supabase/seed.sql` or paste the file into the SQL editor.

## How the baseline was captured

With `supabase db dump`, which is read-only `pg_dump` — **not**
`supabase db pull`.

`db pull` reconciles the remote migration history, and with 67 orphaned rows it
would have tried to rewrite that history on production. Nothing in this process
writes to the production database.

```sh
supabase db dump --linked                  -f public.sql   # 34 tables, 54 functions
supabase db dump --linked --schema auth    -f auth.sql     # the profiles trigger
supabase db dump --linked --schema storage -f storage.sql  # 15 object policies
```

The bucket rows were read from the storage API, since a schema dump does not
include data.

**Only app-owned objects were taken from the auth and storage dumps.** Those
dumps also contain 23 `auth` tables and 8 `storage` tables that Supabase
provisions itself; re-creating them breaks a new project. From `auth` the
baseline keeps exactly one trigger, and from `storage` exactly the 15 policies.

## How to verify a schema change

```sh
supabase db reset                          # baseline + later migrations + seed, from empty
supabase db diff --linked --schema public  # compare the result against production
npm test && npm run test:e2e               # confirm the app runs against it
```

`db diff` should report only migrations production has not received yet, plus
occasional cosmetic policy role reordering (migra normalises `TO
"authenticated", "anon"` to `to anon, authenticated`). Anything else is real
drift.

A clean e2e run with no `instance_settings is missing` warning means the app is
talking to a database built entirely from this repository.

### What verification caught

Applying the baseline to an empty database and diffing it back against
production found a fault that reading the file would never have shown.

**Supabase's default privileges grant `anon` and `authenticated` on every newly
created table in schema `public`, and a dump's explicit
`GRANT ... TO service_role` does not take them away.** A database built from the
baseline was therefore *more permissive than the one it was captured from*, on
`privileged_audit_events`, `privileged_rate_limits`, and
`workspace_google_calendar_integrations`.

The fix is the explicit revoke block at the end of the baseline. The lesson is
that this class of difference is invisible in the SQL and only appears in a
round-trip diff, so **verification is not optional for schema files**.

### A comparison trap worth avoiding

PostgREST only advertises what the calling role may execute. Introspecting
production with the **secret** key and a local database with the **publishable**
key appears to show nine missing functions:

```
consume_privileged_rate_limit, create_status, create_subtask_with_activity,
delete_status, list_orphaned_task_attachment_paths,
record_privileged_audit_event, reorder_statuses, save_task, set_category_access
```

Nothing is missing. Those are privileged functions granted only to
`service_role` and called through the admin client. Always compare like with
like.

## Working on the schema

1. Write a new migration in `supabase/migrations` with a timestamp after the
   latest one.
2. `supabase db reset` to apply it from empty, then `supabase db diff --linked`
   to see exactly what it changes relative to production.
3. Run `npm test` and `npm run test:e2e`.
4. Commit the file. This is the step that was being skipped.
5. `supabase db push` to apply it to each instance's project.

Code that reads a table added by a migration that may not be applied yet can
tolerate a missing relation through `isMissingRelation` in
`lib/server/supabase-errors.ts` and fall back to defaults, so the deploy and the
migration can land in either order. `instance_settings` and `digest_settings`
both do this. That tolerance is only ever for a missing table — every other
database failure must propagate rather than be swallowed.

## Outstanding

- **Mark the baseline applied on production.** Its schema is already there, so
  the history row just needs writing without re-running the SQL:

  ```sh
  supabase migration repair --status applied 20260731000000
  ```

- **Apply the digest migration to production.** `digest_settings` and
  `digest_runs` return 404 on the live project, so the worker is running on
  built-in cadence defaults and `/admin/usage` shows an empty run ledger.

  ```sh
  supabase db push
  ```

- **Once a second instance exists, every migration must be pushed to both
  projects.** A schema change applied to one and not the other is the beginning
  of exactly the drift this document was written to end.
