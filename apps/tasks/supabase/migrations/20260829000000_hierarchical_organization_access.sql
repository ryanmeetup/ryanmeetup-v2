-- Separate the org-chart ladder from lateral teams. A member has exactly one
-- tier; team memberships remain additive. Higher tiers inherit grants made to
-- lower tiers, while a global-content tier (R-Suite) can manage all work
-- without receiving owner-only access administration privileges.
create type public.access_group_kind as enum ('tier', 'team');

alter table public.access_groups
  add column kind public.access_group_kind not null default 'team',
  add column hierarchy_rank integer,
  add column grants_global_content boolean not null default false,
  add constraint access_groups_tier_shape check (
    (kind = 'tier' and hierarchy_rank is not null)
    or (kind = 'team' and hierarchy_rank is null and not grants_global_content)
  ),
  add constraint access_groups_hierarchy_rank_positive check (
    hierarchy_rank is null or hierarchy_rank >= 0
  );

create unique index access_groups_unique_tier_rank
  on public.access_groups(hierarchy_rank)
  where kind = 'tier';

-- Preserve deployed naming variants. Ryan is preferred as the baseline; an
-- older Members group is used only when Ryan does not exist. A completely
-- fresh database has no profiles yet, so its baseline is created atomically by
-- handle_new_user below when the first profile is inserted.
do $$
declare
  baseline_group_id uuid;
begin
  select id into baseline_group_id
  from public.access_groups
  where lower(name) = 'ryan'
  limit 1;

  if baseline_group_id is null then
    select id into baseline_group_id
    from public.access_groups
    where lower(name) = 'members'
    limit 1;
  end if;

  if baseline_group_id is null and exists (select 1 from public.profiles) then
    raise exception 'A Ryan or Members baseline access group is required';
  end if;

  update public.access_groups
  set kind = 'tier', hierarchy_rank = 0
  where id = baseline_group_id;

  update public.access_groups
  set kind = 'tier', hierarchy_rank = 100, grants_global_content = true
  where lower(replace(name, ' ', '-')) = 'r-suite';

  -- Every regular profile receives one baseline tier. Existing lateral
  -- memberships remain intact.
  insert into public.access_group_members (group_id, profile_id, added_by)
  select baseline_group_id, profile.id,
    coalesce((select id from public.profiles where app_role = 'owner' limit 1), profile.id)
  from public.profiles profile
  where profile.app_role = 'member'
    and not exists (
      select 1
      from public.access_group_members membership
      join public.access_groups access_group on access_group.id = membership.group_id
      where membership.profile_id = profile.id and access_group.kind = 'tier'
    )
  on conflict do nothing;
end;
$$;

create or replace function public.member_has_group_access(
  requested_profile_id uuid,
  requested_group_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.access_groups requested_group
    where requested_group.id = requested_group_id
      and (
        (requested_group.kind = 'team' and exists (
          select 1 from public.access_group_members membership
          where membership.profile_id = requested_profile_id
            and membership.group_id = requested_group.id
        ))
        or
        (requested_group.kind = 'tier' and exists (
          select 1
          from public.access_group_members membership
          join public.access_groups member_tier on member_tier.id = membership.group_id
          where membership.profile_id = requested_profile_id
            and member_tier.kind = 'tier'
            and member_tier.hierarchy_rank >= requested_group.hierarchy_rank
        ))
      )
  );
$$;

create or replace function public.has_global_content_access(requested_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = requested_profile_id
      and profile.onboarding_completed
      and (
        profile.app_role = 'owner'
        or exists (
          select 1
          from public.access_group_members membership
          join public.access_groups access_group on access_group.id = membership.group_id
          where membership.profile_id = profile.id
            and access_group.kind = 'tier'
            and access_group.grants_global_content
        )
      )
  );
$$;

create or replace function public.project_permission_for(requested_project_id uuid)
returns public.project_permission
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not public.is_team_member() then null::public.project_permission
    when public.has_global_content_access(auth.uid()) then 'manager'::public.project_permission
    else (
      select case max(permission_rank)
        when 3 then 'manager'::public.project_permission
        when 2 then 'editor'::public.project_permission
        when 1 then 'viewer'::public.project_permission
      end
      from (
        select case grant_row.permission
          when 'manager' then 3 when 'editor' then 2 else 1
        end as permission_rank
        from public.project_group_grants grant_row
        where grant_row.project_id = requested_project_id
          and public.member_has_group_access(auth.uid(), grant_row.group_id)
      ) inherited_grants
    )
  end;
$$;

create or replace function public.can_access_category(requested_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_global_content_access(auth.uid())
    or not exists (
      select 1 from public.category_group_grants grant_row
      where grant_row.category_id = requested_category_id
    )
    or exists (
      select 1 from public.category_group_grants grant_row
      where grant_row.category_id = requested_category_id
        and public.member_has_group_access(auth.uid(), grant_row.group_id)
    );
$$;

create or replace function public.can_assign_to_project(
  requested_profile_id uuid,
  requested_project_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles profile
    where profile.id = requested_profile_id
      and profile.onboarding_completed
      and (
        public.has_global_content_access(profile.id)
        or exists (
          select 1 from public.project_group_grants grant_row
          where grant_row.project_id = requested_project_id
            and public.member_has_group_access(profile.id, grant_row.group_id)
        )
      )
  );
$$;

create or replace function public.enforce_single_access_tier()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.access_groups
    where id = new.group_id and kind = 'tier'
  ) and exists (
    select 1
    from public.access_group_members membership
    join public.access_groups access_group on access_group.id = membership.group_id
    where membership.profile_id = new.profile_id
      and access_group.kind = 'tier'
      and membership.group_id <> new.group_id
  ) then
    raise exception 'A profile may belong to only one organizational tier'
      using errcode = '23505';
  end if;
  return new;
end;
$$;

create trigger access_group_members_single_tier
before insert or update on public.access_group_members
for each row execute function public.enforce_single_access_tier();

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

  delete from public.access_group_members existing
  using public.access_groups access_group
  where existing.profile_id = requested_profile_id
    and existing.group_id = access_group.id
    and access_group.kind = 'tier';

  insert into public.access_group_members (group_id, profile_id, added_by)
  values (requested_group_id, requested_profile_id, auth.uid())
  returning * into membership;
  return membership;
end;
$$;

-- New users always enter at the lowest configured tier. On a fresh database,
-- bootstrap that tier in the same transaction that creates the first profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  baseline_group_id uuid;
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1))
  );

  select access_group.id into baseline_group_id
  from public.access_groups access_group
  where access_group.kind = 'tier'
  order by access_group.hierarchy_rank
  limit 1;

  if baseline_group_id is null then
    insert into public.access_groups (
      name,
      description,
      created_by,
      kind,
      hierarchy_rank
    )
    values (
      'Ryan',
      'Baseline organizational access',
      new.id,
      'tier',
      0
    )
    on conflict (name) do update
      set name = excluded.name
    returning id into baseline_group_id;
  end if;

  insert into public.access_group_members (group_id, profile_id, added_by)
  values (baseline_group_id, new.id, new.id)
  on conflict (group_id, profile_id) do nothing;

  return new;
end;
$$;

notify pgrst, 'reload schema';
