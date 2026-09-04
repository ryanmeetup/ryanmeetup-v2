-- Workspace-wide tiers already retain implicit access, but they are still real
-- access groups. Allow owners to record them explicitly on projects,
-- categories, and page access instead of hiding or rejecting the grant.

create or replace function public.create_project_with_visibility(
  requested_name text,
  requested_description text,
  requested_links jsonb,
  requested_owner_ids uuid[],
  requested_access_mode text,
  requested_group_ids uuid[],
  requested_status text
)
returns setof public.projects
language plpgsql
security definer
set search_path to ''
as $function$
declare
  project_row public.projects;
  normalized_owner_ids uuid[] := coalesce(requested_owner_ids, '{}'::uuid[]);
  normalized_group_ids uuid[] := coalesce(requested_group_ids, '{}'::uuid[]);
begin
  if not public.is_app_owner() then
    raise exception 'Only app owners may create projects' using errcode = '42501';
  end if;
  if cardinality(normalized_owner_ids) = 0 then
    raise exception 'A project requires at least one owner' using errcode = 'RS001';
  end if;
  if exists (
    select 1 from unnest(normalized_owner_ids) requested_owner_id
    where not exists (
      select 1 from public.profiles profile
      where profile.id = requested_owner_id and profile.onboarding_completed
    )
  ) then
    raise exception 'A selected project owner is not eligible' using errcode = 'RS001';
  end if;
  if requested_access_mode not in ('owners', 'open', 'restricted') then
    raise exception 'Invalid project visibility mode' using errcode = '22023';
  end if;
  if requested_status not in (
    'discovery', 'queued', 'active', 'paused', 'complete'
  ) then
    raise exception 'Invalid project status' using errcode = '22023';
  end if;
  if requested_access_mode = 'restricted' and cardinality(normalized_group_ids) = 0 then
    raise exception 'Restricted projects require at least one access group'
      using errcode = 'RS001';
  end if;
  if requested_access_mode <> 'restricted' and cardinality(normalized_group_ids) > 0 then
    raise exception 'Only restricted projects may select access groups'
      using errcode = 'RS001';
  end if;
  if exists (
    select 1 from unnest(normalized_group_ids) requested_group_id
    where not exists (
      select 1 from public.access_groups access_group
      where access_group.id = requested_group_id
    )
  ) then
    raise exception 'An access group is not eligible for project visibility'
      using errcode = 'RS001';
  end if;

  insert into public.projects (
    name,
    description,
    links,
    created_by,
    access_mode,
    status
  ) values (
    requested_name,
    requested_description,
    requested_links,
    auth.uid(),
    requested_access_mode,
    requested_status
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
$function$;

create or replace function public.set_project_visibility(
  requested_project_id uuid,
  requested_access_mode text,
  requested_group_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
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
      using errcode = 'RS001';
  end if;
  if requested_access_mode <> 'restricted' and cardinality(normalized_group_ids) > 0 then
    raise exception 'Only restricted projects may select access groups'
      using errcode = 'RS001';
  end if;
  if exists (
    select 1 from unnest(normalized_group_ids) requested_group_id
    where not exists (
      select 1 from public.access_groups access_group
      where access_group.id = requested_group_id
    )
  ) then
    raise exception 'An access group is not eligible for project visibility'
      using errcode = 'RS001';
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
$function$;

create or replace function public.set_category_access(
  requested_category_id uuid,
  requested_access_mode text,
  requested_group_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not public.is_app_owner() then
    raise exception 'Only app owners may change category access'
      using errcode = '42501';
  end if;
  if requested_access_mode not in ('open', 'restricted') then
    raise exception 'Invalid category access mode' using errcode = 'RS001';
  end if;
  if not exists (
    select 1 from public.work_groups where id = requested_category_id
  ) then
    raise exception 'Category not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1
    from unnest(coalesce(requested_group_ids, '{}'::uuid[])) requested_group_id
    where not exists (
      select 1 from public.access_groups where id = requested_group_id
    )
  ) then
    raise exception 'Invalid access group' using errcode = 'RS001';
  end if;

  update public.work_groups
  set access_mode = requested_access_mode
  where id = requested_category_id;

  delete from public.category_group_grants
  where category_id = requested_category_id;

  if requested_access_mode = 'restricted' then
    insert into public.category_group_grants (
      category_id, group_id, granted_by
    )
    select requested_category_id, requested_group_id, auth.uid()
    from (
      select distinct unnest(
        coalesce(requested_group_ids, '{}'::uuid[])
      ) requested_group_id
    ) requested_groups;
  end if;
end;
$function$;

create or replace function public.set_workspace_area_access(
  requested_area text,
  requested_access_mode text,
  requested_group_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  normalized_area text := btrim(coalesce(requested_area, ''));
  normalized_group_ids uuid[] := coalesce(requested_group_ids, '{}'::uuid[]);
begin
  if not public.is_app_owner() then
    raise exception 'Only app owners may change page access'
      using errcode = '42501';
  end if;
  if normalized_area = '' or char_length(normalized_area) > 40 then
    raise exception 'Invalid page' using errcode = 'RS001';
  end if;
  if requested_access_mode not in ('open', 'restricted') then
    raise exception 'Invalid page access mode' using errcode = 'RS001';
  end if;
  if exists (
    select 1
    from unnest(normalized_group_ids) requested_group_id
    where not exists (
      select 1 from public.access_groups where id = requested_group_id
    )
  ) then
    raise exception 'Invalid access group' using errcode = 'RS001';
  end if;

  insert into public.workspace_area_access (
    area, access_mode, updated_at, updated_by
  )
  values (normalized_area, requested_access_mode, now(), auth.uid())
  on conflict (area) do update
    set access_mode = excluded.access_mode,
        updated_at = now(),
        updated_by = auth.uid();

  delete from public.workspace_area_group_grants
  where area = normalized_area;

  if requested_access_mode = 'restricted' then
    insert into public.workspace_area_group_grants (area, group_id, granted_by)
    select normalized_area, requested_group_id, auth.uid()
    from (
      select distinct unnest(normalized_group_ids) requested_group_id
    ) requested_groups;
  end if;
end;
$function$;
