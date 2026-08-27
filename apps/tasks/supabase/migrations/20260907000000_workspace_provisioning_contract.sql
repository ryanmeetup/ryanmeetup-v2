-- Workspace provisioning and project visibility contract.
--
-- These objects were applied directly to the Ryan Meetup Tasks project while
-- the single-visibility-mode and recoverable-onboarding work landed, and no
-- migration file was ever committed for them. A second instance built from
-- this repository therefore came up without `provision_workspace_member`,
-- `beginner_flow_health`, `repair_beginner_flow`, or `projects.access_mode`,
-- and `scripts/check-database-contract.mjs` correctly refused the deploy.
--
-- Captured with `supabase db diff --linked` against the first instance, so it
-- is exactly the drift and nothing else. The first instance already has every
-- object here; mark it applied there rather than running it:
--
--   supabase migration repair --status applied 20260907000000
--
drop trigger if exists "projects_grant_creator_groups" on "public"."projects";

drop policy "owners delete projects" on "public"."projects";

drop policy "instance settings are publicly readable" on "public"."instance_settings";

alter table "public"."access_groups" add column "is_default" boolean not null default false;

alter table "public"."projects" add column "access_mode" text not null default 'owners'::text;

CREATE UNIQUE INDEX access_groups_one_default_tier ON public.access_groups USING btree (is_default) WHERE is_default;

alter table "public"."access_groups" add constraint "access_groups_default_tier_check" CHECK (((NOT is_default) OR (kind = 'tier'::public.access_group_kind))) not valid;

alter table "public"."access_groups" validate constraint "access_groups_default_tier_check";

alter table "public"."projects" add constraint "projects_access_mode_check" CHECK ((access_mode = ANY (ARRAY['owners'::text, 'open'::text, 'restricted'::text]))) not valid;

alter table "public"."projects" validate constraint "projects_access_mode_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.beginner_flow_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  contract_ok boolean;
  default_tier_count integer;
  profile_count integer;
  profiles_without_tier integer;
  auth_users_without_profile integer;
  status_count integer;
  profile_trigger_active boolean;
begin
  if auth.uid() is not null and not public.is_app_owner() then
    raise exception 'Only app owners may inspect workspace health'
      using errcode = '42501';
  end if;

  select count(*) into default_tier_count
  from public.access_groups
  where is_default and kind = 'tier';

  select count(*) into profile_count from public.profiles;

  select count(*) into profiles_without_tier
  from public.profiles profile
  where not exists (
    select 1
    from public.access_group_members membership
    join public.access_groups access_group
      on access_group.id = membership.group_id
    where membership.profile_id = profile.id
      and access_group.kind = 'tier'
  );

  select count(*) into auth_users_without_profile
  from auth.users auth_user
  where not exists (
    select 1 from public.profiles profile where profile.id = auth_user.id
  );

  select count(*) into status_count from public.statuses;

  select exists (
    select 1
    from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'auth_user_profile'
      and tgenabled <> 'D'
  ) into profile_trigger_active;

  select
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'projects'
        and column_name = 'access_mode'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'access_groups'
        and column_name = 'is_default'
    )
    and to_regprocedure(
      'public.provision_workspace_member(uuid,text,text)'
    ) is not null
    and to_regprocedure(
      'public.create_project_with_visibility(text,text,jsonb,uuid[],text,uuid[])'
    ) is not null
    and to_regprocedure(
      'public.set_project_visibility(uuid,text,uuid[])'
    ) is not null
  into contract_ok;

  return jsonb_build_object(
    'healthy',
      contract_ok
      and profile_trigger_active
      and default_tier_count = 1
      and profiles_without_tier = 0
      and auth_users_without_profile = 0
      and status_count > 0,
    'contractOk', contract_ok,
    'profileTriggerActive', profile_trigger_active,
    'defaultTierCount', default_tier_count,
    'profileCount', profile_count,
    'profilesWithoutTier', profiles_without_tier,
    'authUsersWithoutProfile', auth_users_without_profile,
    'statusCount', status_count
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_project_with_visibility(requested_name text, requested_description text, requested_links jsonb, requested_owner_ids uuid[], requested_access_mode text, requested_group_ids uuid[])
 RETURNS SETOF public.projects
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  project_row public.projects;
  normalized_owner_ids uuid[] := coalesce(requested_owner_ids, '{}'::uuid[]);
  normalized_group_ids uuid[] := coalesce(requested_group_ids, '{}'::uuid[]);
begin
  if not public.is_app_owner() then
    raise exception 'Only app owners may create projects' using errcode = '42501';
  end if;
  if cardinality(normalized_owner_ids) = 0 then
    raise exception 'A project requires at least one owner' using errcode = '23514';
  end if;
  if exists (
    select 1 from unnest(normalized_owner_ids) requested_owner_id
    where not exists (
      select 1 from public.profiles profile
      where profile.id = requested_owner_id and profile.onboarding_completed
    )
  ) then
    raise exception 'A selected project owner is not eligible' using errcode = '23514';
  end if;
  if requested_access_mode not in ('owners', 'open', 'restricted') then
    raise exception 'Invalid project visibility mode' using errcode = '22023';
  end if;
  if requested_access_mode = 'restricted' and cardinality(normalized_group_ids) = 0 then
    raise exception 'Restricted projects require at least one access group'
      using errcode = '23514';
  end if;
  if requested_access_mode <> 'restricted' and cardinality(normalized_group_ids) > 0 then
    raise exception 'Only restricted projects may select access groups'
      using errcode = '23514';
  end if;
  if exists (
    select 1 from unnest(normalized_group_ids) requested_group_id
    where not exists (
      select 1 from public.access_groups access_group
      where access_group.id = requested_group_id
        and not access_group.grants_global_content
    )
  ) then
    raise exception 'An access group is not eligible for project visibility'
      using errcode = '23514';
  end if;

  insert into public.projects (
    name,
    description,
    links,
    created_by,
    access_mode
  ) values (
    requested_name,
    requested_description,
    requested_links,
    auth.uid(),
    requested_access_mode
  ) returning * into project_row;

  insert into public.project_owners (project_id, profile_id)
  select project_row.id, requested_owner_id
  from (
    select distinct unnest(normalized_owner_ids) as requested_owner_id
  ) requested_owners;

  if requested_access_mode = 'restricted' then
    insert into public.project_group_grants (
      project_id,
      group_id,
      permission,
      granted_by
    )
    select
      project_row.id,
      requested_group_id,
      'editor'::public.project_permission,
      auth.uid()
    from (
      select distinct unnest(normalized_group_ids) as requested_group_id
    ) requested_groups;
  end if;

  return next project_row;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_project_visibility_after_group_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.projects project
  set access_mode = 'owners'
  where project.access_mode = 'restricted'
    and not exists (
      select 1 from public.project_group_grants grant_row
      where grant_row.project_id = project.id
    );
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.protect_default_access_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.is_default then
    raise exception 'The default access tier cannot be deleted'
      using errcode = '23514';
  end if;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.provision_workspace_member(requested_profile_id uuid, requested_full_name text DEFAULT NULL::text, requested_email text DEFAULT NULL::text)
 RETURNS public.profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  default_tier_id uuid;
  saved_profile public.profiles;
begin
  if requested_profile_id is null then
    raise exception 'A profile id is required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('public.workspace_member.provision', 0)
  );

  insert into public.profiles (id, full_name)
  values (
    requested_profile_id,
    coalesce(
      nullif(trim(requested_full_name), ''),
      nullif(split_part(coalesce(requested_email, ''), '@', 1), ''),
      'New teammate'
    )
  )
  on conflict (id) do nothing;

  insert into public.statuses (
    name,
    description,
    color,
    sort_order,
    is_default,
    is_completed
  )
  select * from (values
    ('Backlog', 'Ideas and requests that are not ready to schedule yet.', '#64748b', 0, true, false),
    ('Todo', 'Ready to be picked up and worked on.', '#2563eb', 1, true, false),
    ('In Progress', 'Actively being worked on right now.', '#d97706', 2, true, false),
    ('In Review', 'Waiting for feedback, approval, or final checks.', '#7c3aed', 3, true, false),
    ('Done', 'Finished work that no longer needs action.', '#059669', 4, true, true),
    ('Will Not Do', null, '#f51b2b', 5, true, false)
  ) as defaults (name, description, color, sort_order, is_default, is_completed)
  where not exists (select 1 from public.statuses);

  select id into default_tier_id
  from public.access_groups
  where is_default and kind = 'tier'
  limit 1;

  if default_tier_id is null then
    select id into default_tier_id
    from public.access_groups
    where kind = 'tier'
    order by hierarchy_rank, created_at, id
    limit 1;

    if default_tier_id is null then
      insert into public.access_groups (
        name,
        description,
        created_by,
        kind,
        hierarchy_rank,
        is_default
      ) values (
        'Members',
        'The baseline tier inherited by everyone in the workspace.',
        requested_profile_id,
        'tier',
        0,
        true
      )
      returning id into default_tier_id;
    else
      update public.access_groups
      set is_default = true
      where id = default_tier_id;
    end if;
  end if;

  if not exists (
    select 1
    from public.access_group_members membership
    join public.access_groups access_group
      on access_group.id = membership.group_id
    where membership.profile_id = requested_profile_id
      and access_group.kind = 'tier'
  ) then
    insert into public.access_group_members (group_id, profile_id, added_by)
    values (default_tier_id, requested_profile_id, requested_profile_id)
    on conflict do nothing;
  end if;

  select * into saved_profile
  from public.profiles
  where id = requested_profile_id;

  return saved_profile;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.repair_beginner_flow()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  auth_user record;
begin
  if auth.uid() is not null and not public.is_app_owner() then
    raise exception 'Only app owners may repair workspace provisioning'
      using errcode = '42501';
  end if;

  for auth_user in
    select id, email, raw_user_meta_data
    from auth.users
    order by created_at, id
  loop
    perform public.provision_workspace_member(
      auth_user.id,
      auth_user.raw_user_meta_data ->> 'full_name',
      auth_user.email
    );
  end loop;

  return public.beginner_flow_health();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_project_visibility(requested_project_id uuid, requested_access_mode text, requested_group_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  normalized_group_ids uuid[] := coalesce(requested_group_ids, '{}'::uuid[]);
begin
  if not public.can_manage_project(requested_project_id) then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;
  if requested_access_mode not in ('owners', 'open', 'restricted') then
    raise exception 'Invalid project visibility mode' using errcode = '22023';
  end if;
  if requested_access_mode = 'restricted' and cardinality(normalized_group_ids) = 0 then
    raise exception 'Restricted projects require at least one access group'
      using errcode = '23514';
  end if;
  if requested_access_mode <> 'restricted' and cardinality(normalized_group_ids) > 0 then
    raise exception 'Only restricted projects may select access groups'
      using errcode = '23514';
  end if;
  if exists (
    select 1 from unnest(normalized_group_ids) requested_group_id
    where not exists (
      select 1 from public.access_groups access_group
      where access_group.id = requested_group_id
        and not access_group.grants_global_content
    )
  ) then
    raise exception 'An access group is not eligible for project visibility'
      using errcode = '23514';
  end if;

  update public.projects
  set access_mode = requested_access_mode
  where id = requested_project_id;

  delete from public.project_group_grants
  where project_id = requested_project_id;

  if requested_access_mode = 'restricted' then
    insert into public.project_group_grants (
      project_id,
      group_id,
      permission,
      granted_by
    )
    select
      requested_project_id,
      requested_group_id,
      'editor'::public.project_permission,
      auth.uid()
    from (
      select distinct unnest(normalized_group_ids) as requested_group_id
    ) requested_groups;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.can_assign_to_project(requested_profile_id uuid, requested_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select public.is_app_owner() or exists (
    select 1
    from public.profiles profile
    where profile.id = requested_profile_id
      and profile.onboarding_completed
      and (
        requested_project_id is null
        or public.has_global_content_access(profile.id)
        or exists (
          select 1 from public.project_owners owner_row
          where owner_row.project_id = requested_project_id
            and owner_row.profile_id = profile.id
        )
        or exists (
          select 1 from public.projects project
          where project.id = requested_project_id
            and project.access_mode = 'open'
        )
        or exists (
          select 1 from public.project_group_grants grant_row
          where grant_row.project_id = requested_project_id
            and public.member_has_group_access(profile.id, grant_row.group_id)
        )
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.provision_workspace_member(
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email
  );
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.project_permission_for(requested_project_id uuid)
 RETURNS public.project_permission
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case
    when not public.is_team_member() then null::public.project_permission
    when public.has_global_content_access(auth.uid()) then 'manager'::public.project_permission
    when exists (
      select 1 from public.project_owners owner_row
      where owner_row.project_id = requested_project_id
        and owner_row.profile_id = auth.uid()
    ) then 'manager'::public.project_permission
    when exists (
      select 1 from public.projects project
      where project.id = requested_project_id
        and project.access_mode = 'open'
    ) then 'editor'::public.project_permission
    when exists (
      select 1 from public.project_group_grants grant_row
      where grant_row.project_id = requested_project_id
        and public.member_has_group_access(auth.uid(), grant_row.group_id)
    ) then 'editor'::public.project_permission
    else null::public.project_permission
  end;
$function$
;


  create policy "project managers delete projects"
  on "public"."projects"
  as permissive
  for delete
  to public
using (public.can_manage_project(id));



  create policy "instance settings are publicly readable"
  on "public"."instance_settings"
  as permissive
  for select
  to anon, authenticated
using (true);


CREATE TRIGGER access_groups_normalize_project_visibility AFTER DELETE ON public.access_groups FOR EACH STATEMENT EXECUTE FUNCTION public.normalize_project_visibility_after_group_delete();

CREATE TRIGGER access_groups_protect_default_tier BEFORE DELETE ON public.access_groups FOR EACH ROW EXECUTE FUNCTION public.protect_default_access_tier();


