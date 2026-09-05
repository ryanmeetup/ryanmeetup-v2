-- Give app owners one transactional workflow for a person's complete access,
-- including succession, and make the new-member default tier explicit.

create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if old.app_role = 'owner'
    and (tg_op = 'DELETE' or new.app_role <> 'owner')
    and (select count(*) from public.profiles where app_role = 'owner') <= 1
  then
    raise exception 'Promote another app owner before removing or demoting the last owner'
      using errcode = 'AO001';
  end if;
  if tg_op = 'UPDATE'
    and old.app_role is distinct from new.app_role
    and exists (select 1 from public.profiles where app_role = 'owner')
    and not public.is_app_owner()
  then
    raise exception 'Only an app owner can change app roles'
      using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

create or replace function public.replace_profile_access(
  requested_profile_id uuid,
  requested_tier_id uuid,
  requested_team_ids uuid[],
  requested_app_role text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  normalized_team_ids uuid[] := array(
    select distinct requested_id
    from unnest(coalesce(requested_team_ids, '{}'::uuid[])) requested_id
    order by requested_id
  );
  saved_profile public.profiles;
  saved_members jsonb;
begin
  if not public.is_app_owner() then
    raise exception 'Only app owners may change a teammate''s access'
      using errcode = '42501';
  end if;
  if requested_app_role not in ('owner', 'member') then
    raise exception 'Invalid app role' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles where id = requested_profile_id
  ) then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1
    from public.access_groups
    where id = requested_tier_id and kind = 'tier'
  ) then
    raise exception 'Choose one organizational tier' using errcode = 'RS001';
  end if;
  if exists (
    select 1
    from unnest(normalized_team_ids) requested_team_id
    where not exists (
      select 1
      from public.access_groups
      where id = requested_team_id and kind = 'team'
    )
  ) then
    raise exception 'A selected team is not available' using errcode = 'RS001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('public.profile_access.' || requested_profile_id::text, 0)
  );
  perform set_config('app.replacing_access_tier', 'true', true);

  delete from public.access_group_members
  where profile_id = requested_profile_id;

  insert into public.access_group_members (group_id, profile_id, added_by)
  values (requested_tier_id, requested_profile_id, auth.uid());

  insert into public.access_group_members (group_id, profile_id, added_by)
  select requested_team_id, requested_profile_id, auth.uid()
  from unnest(normalized_team_ids) requested_team_id;

  update public.profiles
  set app_role = requested_app_role::public.app_role
  where id = requested_profile_id
  returning * into saved_profile;

  perform set_config('app.replacing_access_tier', 'false', true);

  select coalesce(jsonb_agg(to_jsonb(membership)), '[]'::jsonb)
  into saved_members
  from public.access_group_members membership
  where membership.profile_id = requested_profile_id;

  return jsonb_build_object(
    'profile', to_jsonb(saved_profile),
    'members', saved_members
  );
end;
$function$;

comment on function public.replace_profile_access(uuid,uuid,uuid[],text) is
  'Atomically replaces one profile''s app role, required tier, and optional teams. The last-owner trigger prevents lockout.';

revoke all on function public.replace_profile_access(uuid,uuid,uuid[],text) from public, anon;
grant execute on function public.replace_profile_access(uuid,uuid,uuid[],text) to authenticated, service_role;

create or replace function public.set_default_access_tier(
  requested_group_id uuid
)
returns public.access_groups
language plpgsql
security definer
set search_path to ''
as $function$
declare
  saved_group public.access_groups;
begin
  if not public.is_app_owner() then
    raise exception 'Only app owners may change the default tier'
      using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.access_groups
    where id = requested_group_id and kind = 'tier'
  ) then
    raise exception 'The requested access group is not a tier'
      using errcode = 'RS001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('public.access_groups.default_tier', 0)
  );
  update public.access_groups
  set is_default = false
  where is_default and id <> requested_group_id;
  update public.access_groups
  set is_default = true
  where id = requested_group_id
  returning * into saved_group;

  return saved_group;
end;
$function$;

comment on function public.set_default_access_tier(uuid) is
  'Selects the one organizational tier assigned automatically to new workspace members.';

revoke all on function public.set_default_access_tier(uuid) from public, anon;
grant execute on function public.set_default_access_tier(uuid) to authenticated, service_role;
