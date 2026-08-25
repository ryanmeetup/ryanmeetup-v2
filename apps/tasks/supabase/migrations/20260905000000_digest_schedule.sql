-- Digest cadence, structure, and a delivery ledger.
--
-- Before this, the schedule lived in `vercel.json` and a failed run left no
-- trace anywhere: the worker returned its counts in a 200 response body that
-- nothing read, so a run that stopped happening was invisible. `digest_runs`
-- makes every invocation observable from /admin/usage, and `digest_settings`
-- moves the cadence out of the deployment so changing it is an edit, not a
-- redeploy.

create table if not exists public.digest_settings (
  -- Singleton, matching the `instance_settings` convention.
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  -- Send days as `Date.getDay()` indexes, 0 = Sunday.
  weekdays smallint[] not null default '{1,2,3,4,5}',
  send_hour smallint not null default 9,
  time_zone text not null default 'America/New_York',
  review_minutes smallint not null default 30,
  upcoming_days smallint not null default 3,
  recent_days smallint not null default 3,
  -- Enabled sections, in the order they render in the message.
  sections text[] not null default
    '{overdue,dueToday,upcoming,highPriority,recentlyUpdated}',
  max_recipients smallint not null default 90,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint digest_settings_send_hour_valid
    check (send_hour between 0 and 23),
  constraint digest_settings_review_minutes_valid
    check (review_minutes between 5 and 1440),
  constraint digest_settings_upcoming_days_valid
    check (upcoming_days between 1 and 30),
  constraint digest_settings_recent_days_valid
    check (recent_days between 1 and 30),
  -- 90 keeps a full run inside the Resend free tier's 100/day ceiling.
  constraint digest_settings_max_recipients_valid
    check (max_recipients between 1 and 90),
  constraint digest_settings_time_zone_valid
    check (length(time_zone) between 1 and 64),
  constraint digest_settings_weekdays_valid check (
    cardinality(weekdays) between 1 and 7
    and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  constraint digest_settings_sections_valid check (
    cardinality(sections) between 1 and 5
    and sections <@ array[
      'overdue', 'dueToday', 'upcoming', 'highPriority', 'recentlyUpdated'
    ]::text[]
  )
);

insert into public.digest_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.digest_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  -- The workspace-local date the run classified tasks against.
  digest_date date,
  time_zone text,
  outcome text not null,
  source text not null default 'cron',
  scheduled_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  -- When the messages this run created are due to leave Resend.
  deliver_at timestamptz,
  detail text,
  constraint digest_runs_outcome_valid check (
    outcome in (
      'sent', 'empty', 'off_schedule', 'paused', 'unconfigured', 'failed'
    )
  ),
  constraint digest_runs_source_valid check (source in ('cron', 'manual'))
);

create index if not exists digest_runs_ran_at_idx
  on public.digest_runs (ran_at desc);

-- Owners read both tables; every write goes through the service role, so no
-- insert, update, or delete policy is granted to end users.
alter table public.digest_settings enable row level security;
alter table public.digest_runs enable row level security;

drop policy if exists "Owners read digest settings" on public.digest_settings;
create policy "Owners read digest settings"
  on public.digest_settings for select to authenticated
  using (public.is_app_owner());

drop policy if exists "Owners read digest runs" on public.digest_runs;
create policy "Owners read digest runs"
  on public.digest_runs for select to authenticated
  using (public.is_app_owner());
