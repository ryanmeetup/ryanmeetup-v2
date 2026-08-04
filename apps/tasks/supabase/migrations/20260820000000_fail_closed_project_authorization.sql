-- Project authorization is always fail-closed. Deployment readiness belongs in
-- this migration, never in a function consulted by RLS at request time.
do $$
begin
  if exists (select 1 from public.profiles) and not exists (
    select 1 from public.profiles
    where app_role = 'owner' and onboarding_completed
  ) then
    raise exception 'Cannot enable fail-closed access: no onboarded app owner exists';
  end if;

  if exists (
    select 1
    from public.projects p
    where not exists (
      select 1 from public.project_group_grants g where g.project_id = p.id
    )
  ) then
    raise exception 'Cannot enable fail-closed access: every project must have a group grant';
  end if;

  if exists (
    select 1
    from public.task_attachments
    where file_path is not null
      and file_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/'
  ) then
    raise exception 'Cannot enable fail-closed access: legacy attachment paths remain';
  end if;
end;
$$;

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.profiles
    where id = auth.uid() and onboarding_completed
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
    when public.is_app_owner() then 'manager'::public.project_permission
    else (
      select case max(permission_rank)
        when 3 then 'manager'::public.project_permission
        when 2 then 'editor'::public.project_permission
        when 1 then 'viewer'::public.project_permission
      end
      from (
        select case pgg.permission
          when 'manager' then 3
          when 'editor' then 2
          else 1
        end as permission_rank
        from public.project_group_grants pgg
        join public.access_group_members agm on agm.group_id = pgg.group_id
        where pgg.project_id = requested_project_id
          and agm.profile_id = auth.uid()
      ) explicit_grants
    )
  end;
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
    select 1
    from public.profiles p
    where p.id = requested_profile_id
      and p.onboarding_completed
      and (
        p.app_role = 'owner'
        or exists (
          select 1
          from public.access_group_members m
          join public.project_group_grants g on g.group_id = m.group_id
          where m.profile_id = p.id and g.project_id = requested_project_id
        )
      )
  );
$$;

drop policy if exists "legacy task files remain readable during rollout" on storage.objects;
drop policy if exists "legacy task files remain deletable during rollout" on storage.objects;
drop function if exists public.access_control_enabled();

-- This AFTER trigger runs inside the project INSERT transaction. Raising here
-- rolls back both the project and any grants inserted earlier in the trigger.
create or replace function public.grant_new_project_to_creator_groups()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  granted_group_count integer;
begin
  insert into public.project_group_grants (
    project_id,
    group_id,
    permission,
    granted_by
  )
  select
    new.id,
    membership.group_id,
    'viewer'::public.project_permission,
    new.created_by
  from public.access_group_members membership
  join public.profiles creator
    on creator.id = membership.profile_id
   and creator.onboarding_completed
  where membership.profile_id = new.created_by;

  get diagnostics granted_group_count = row_count;
  if granted_group_count = 0 then
    raise exception 'A project creator must belong to at least one access group'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
