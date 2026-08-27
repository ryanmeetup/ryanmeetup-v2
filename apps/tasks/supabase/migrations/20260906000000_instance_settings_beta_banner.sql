-- Beta banner settings on `instance_settings`.
--
-- These three columns and the `feedback_url` check were added to the baseline's
-- `create table if not exists` block rather than to a forward migration. On a
-- database that already had the table — which is every existing instance, since
-- `instance_settings` predates the baseline — `if not exists` is a no-op, so the
-- columns were never created. `lib/server/instance-settings.ts` selects all of
-- `INSTANCE_SETTINGS_COLUMNS` from the root layout, and an undefined column is
-- not a missing relation, so it propagated and every route returned a 500.
--
-- The baseline keeps its copy for a build from empty; this migration carries the
-- same shape to databases that already exist.

alter table public.instance_settings
  add column if not exists beta_banner_enabled boolean,
  add column if not exists feedback_in_workspace boolean,
  add column if not exists feedback_url text;

alter table public.instance_settings
  drop constraint if exists instance_settings_feedback_url_check;

alter table public.instance_settings
  add constraint instance_settings_feedback_url_check check (
    feedback_url ~ '^https://[^\s]+$'
    or feedback_url ~ '^mailto:[^\s@]+@[^\s@]+$'
  );
