-- Keep the one-tier invariant intact when groups or memberships are changed
-- through paths other than the owner-facing API.
create or replace function public.protect_access_group_kind()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.kind <> new.kind and exists (
    select 1 from public.access_group_members where group_id = old.id
  ) then
    raise exception 'A populated access group cannot change between team and tier'
      using errcode = '23514';
  end if;
  if tg_op = 'DELETE' and old.kind = 'tier' and exists (
    select 1 from public.access_group_members where group_id = old.id
  ) then
    raise exception 'Move every member to another tier before deleting this tier'
      using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger access_groups_protect_kind
before update of kind or delete on public.access_groups
for each row execute function public.protect_access_group_kind();

create or replace function public.protect_required_tier_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() <= 1
    and coalesce(current_setting('app.replacing_access_tier', true), 'false') <> 'true'
    and exists (
      select 1 from public.access_groups
      where id = old.group_id and kind = 'tier'
    )
    and exists (
      select 1 from public.profiles
      where id = old.profile_id and app_role = 'member'
    )
  then
    raise exception 'A regular member must always have an organizational tier'
      using errcode = '23514';
  end if;
  return old;
end;
$$;

create trigger access_group_members_require_tier
before delete on public.access_group_members
for each row execute function public.protect_required_tier_membership();

create or replace function public.set_profile_access_tier(
  requested_profile_id uuid,
  requested_group_id uuid
)
returns public.access_group_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership public.access_group_members;
begin
  if not public.is_app_owner() then
    raise exception 'Only app owners may change organizational tiers'
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.access_groups
    where id = requested_group_id and kind = 'tier'
  ) then
    raise exception 'The requested access group is not a tier'
      using errcode = '23514';
  end if;

  perform set_config('app.replacing_access_tier', 'true', true);
  delete from public.access_group_members existing
  using public.access_groups access_group
  where existing.profile_id = requested_profile_id
    and existing.group_id = access_group.id
    and access_group.kind = 'tier';

  insert into public.access_group_members (group_id, profile_id, added_by)
  values (requested_group_id, requested_profile_id, auth.uid())
  returning * into membership;
  perform set_config('app.replacing_access_tier', 'false', true);
  return membership;
end;
$$;

notify pgrst, 'reload schema';
