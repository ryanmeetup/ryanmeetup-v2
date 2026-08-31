-- Generalize the beta banner into a banner the instance writes itself.
--
-- The notice was assembled from the instance name -- "RYAN MEETUP is in beta."
-- -- which read as though the product were named after whoever the workspace
-- belongs to. The name is the wordmark of one instance, not the name of this
-- app, and a banner that can only announce a beta is a banner most instances
-- have no use for. The message is now stored text an owner writes, so the
-- notice can carry a maintenance window, a policy change, or nothing at all.
--
-- `feedback_in_workspace` goes with it. Routing feedback into this workspace's
-- own backlog was only ever true of the deployment where the product is built,
-- and it hard-coded that one instance's arrangement into everyone's settings
-- form. What is left is a plain link with a label.

-- The two columns worth keeping are renamed rather than replaced, so an
-- instance that had already turned the banner off or pointed the link
-- somewhere keeps that choice through the deploy.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'instance_settings'
      and column_name = 'beta_banner_enabled'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'instance_settings'
      and column_name = 'banner_enabled'
  ) then
    alter table public.instance_settings
      rename column beta_banner_enabled to banner_enabled;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'instance_settings'
      and column_name = 'feedback_url'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'instance_settings'
      and column_name = 'banner_link_url'
  ) then
    alter table public.instance_settings
      rename column feedback_url to banner_link_url;
  end if;
end $$;

alter table public.instance_settings
  add column if not exists banner_enabled boolean,
  add column if not exists banner_message text,
  add column if not exists banner_link_url text,
  add column if not exists banner_link_label text;

alter table public.instance_settings
  drop column if exists feedback_in_workspace;

-- The link is rendered as an anchor members are invited to click, so the shape
-- is enforced here as well as in the API: an https page or a mailto address.
alter table public.instance_settings
  drop constraint if exists instance_settings_feedback_url_check;

alter table public.instance_settings
  drop constraint if exists instance_settings_banner_link_url_check;

alter table public.instance_settings
  add constraint instance_settings_banner_link_url_check check (
    banner_link_url ~ '^https://[^\s]+$'
    or banner_link_url ~ '^mailto:[^\s@]+@[^\s@]+$'
  );

-- Both are single-line chrome above the workspace, so they are bounded here
-- rather than left to whatever the form happens to submit.
alter table public.instance_settings
  drop constraint if exists instance_settings_banner_message_check;

alter table public.instance_settings
  add constraint instance_settings_banner_message_check check (
    banner_message = trim(banner_message)
    and char_length(banner_message) between 1 and 200
  );

alter table public.instance_settings
  drop constraint if exists instance_settings_banner_link_label_check;

alter table public.instance_settings
  add constraint instance_settings_banner_link_label_check check (
    banner_link_label = trim(banner_link_label)
    and char_length(banner_link_label) between 1 and 60
  );
