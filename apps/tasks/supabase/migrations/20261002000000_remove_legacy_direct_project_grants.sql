-- Direct per-user project grants stopped contributing to authorization when
-- project ownership and access groups became canonical. Keeping the inert
-- table and its mutation RPC made it look like a second supported authority.

drop function if exists public.replace_project_managers(uuid, uuid[]);
drop table if exists public.project_user_grants;

create or replace function public.beginner_flow_health()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
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
    and to_regprocedure(
      'public.can_administer_project_access(uuid)'
    ) is not null
    and to_regprocedure(
      'public.replace_profile_access(uuid,uuid,uuid[],text)'
    ) is not null
    and to_regprocedure(
      'public.set_default_access_tier(uuid)'
    ) is not null
    and to_regprocedure(
      'public.record_workspace_activity_event(uuid,text,text,uuid,jsonb)'
    ) is not null
    and to_regprocedure(
      'public.owner_change_detail(uuid[],uuid[])'
    ) is not null
    and to_regclass('public.project_user_grants') is null
    and exists (
      select 1
      from pg_trigger
      where tgrelid = 'public.projects'::regclass
        and tgname = 'projects_protect_access_mode'
        and tgenabled <> 'D'
    )
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
$function$;

revoke all on function public.beginner_flow_health() from public, anon, authenticated;
grant execute on function public.beginner_flow_health() to service_role;
