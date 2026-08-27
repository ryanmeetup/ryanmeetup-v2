alter table public.projects
add column status text not null default 'active';

alter table public.projects
add constraint projects_status_check
check (status in ('exploring', 'planned', 'active', 'ongoing', 'paused', 'complete'));

comment on column public.projects.status is
  'Project lifecycle: exploring, planned, active, ongoing, paused, or complete.';

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
  if requested_status not in (
    'exploring', 'planned', 'active', 'ongoing', 'paused', 'complete'
  ) then
    raise exception 'Invalid project status' using errcode = '22023';
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
