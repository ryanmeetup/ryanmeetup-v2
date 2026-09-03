-- Say which value the form should not have offered.
--
-- The resource mutations validate their input before they write: a project or
-- category needs an owner, an owner has to have finished onboarding, only a
-- restricted resource may name access groups. Each of those raised `23514`,
-- the SQLSTATE Postgres itself uses for a check constraint, so the API could
-- not tell a message it had authored for the user apart from `new row for
-- relation "projects" violates check constraint ...` -- and answered both with
-- "Some of the submitted information is no longer valid. Refresh and try
-- again." Choosing a teammate who had not finished onboarding, which the owner
-- picker offered, produced exactly that: a banner that named nothing.
--
-- These raises now carry `RS001`, the way `save_task` already carries `TK001`
-- for a missing status reason. The code is what makes the message returnable:
-- the API answers `RS001` with the message verbatim, and keeps the generic
-- wording for a real `23514` from a constraint, whose text describes the table
-- rather than the person reading it.
--
-- Nothing else about these functions changes.

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
        and not access_group.grants_global_content
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

create or replace function public.replace_project_owners_and_update(
  requested_project_id uuid,
  requested_values jsonb
)
returns setof public.projects
language plpgsql
security definer
set search_path to ''
as $function$
declare
  project_row public.projects;
  normalized_owner_ids uuid[];
  previous_owner_ids uuid[];
  owner_detail text;
begin
  if not public.can_manage_project(requested_project_id) then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  if requested_values ? 'ownerIds' then
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into normalized_owner_ids
    from jsonb_array_elements_text(requested_values -> 'ownerIds');
    if cardinality(normalized_owner_ids) = 0 then
      raise exception 'A project requires at least one owner' using errcode = 'RS001';
    end if;
    if exists (
      select 1 from unnest(normalized_owner_ids) owner_id
      where not exists (
        select 1 from public.profiles profile
        where profile.id = owner_id and profile.onboarding_completed
      )
    ) then
      raise exception 'A selected project owner is not eligible' using errcode = 'RS001';
    end if;
  end if;

  update public.projects
  set
    name = case when requested_values ? 'name' then requested_values ->> 'name' else name end,
    description = case when requested_values ? 'description' then requested_values ->> 'description' else description end,
    links = case when requested_values ? 'links' then requested_values -> 'links' else links end,
    status = case when requested_values ? 'status' then requested_values ->> 'status' else status end,
    archived_at = case when requested_values ? 'archived' then
      case when (requested_values ->> 'archived')::boolean then now() else null end
      else archived_at end
  where id = requested_project_id
  returning * into project_row;

  if project_row.id is null then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  if normalized_owner_ids is not null then
    select coalesce(array_agg(profile_id), '{}'::uuid[])
    into previous_owner_ids
    from public.project_owners
    where project_id = requested_project_id;

    delete from public.project_owners where project_id = requested_project_id;
    insert into public.project_owners (project_id, profile_id)
    select requested_project_id, owner_id
    from (select distinct unnest(normalized_owner_ids) owner_id) owners;

    owner_detail := public.owner_change_detail(
      previous_owner_ids, normalized_owner_ids
    );
    if owner_detail is not null then
      insert into public.permission_audit_events (
        actor_id, action, target_type, target_id, before_state, after_state
      ) values (
        auth.uid(),
        'project.owners.update',
        'project',
        requested_project_id,
        null,
        jsonb_build_object(
          'activity', true,
          'resource_name', project_row.name,
          'resource_href', '/projects',
          'project_id', requested_project_id,
          'detail', owner_detail
        )
      );
    end if;
  end if;

  return next project_row;
end;
$function$;

create or replace function public.create_category_with_owners(
  requested_name text,
  requested_description text,
  requested_color text,
  requested_links jsonb,
  requested_tags text[],
  requested_owner_ids uuid[],
  requested_access_mode text,
  requested_group_ids uuid[]
)
returns setof public.work_groups
language plpgsql
security definer
set search_path to ''
as $function$
declare
  category_row public.work_groups;
  normalized_owner_ids uuid[] := coalesce(requested_owner_ids, '{}'::uuid[]);
begin
  if not public.can_manage_categories() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if cardinality(normalized_owner_ids) = 0 then
    raise exception 'A category requires at least one owner' using errcode = 'RS001';
  end if;
  if exists (
    select 1 from unnest(normalized_owner_ids) owner_id
    where not exists (
      select 1 from public.profiles profile
      where profile.id = owner_id and profile.onboarding_completed
    )
  ) then
    raise exception 'A selected category owner is not eligible' using errcode = 'RS001';
  end if;
  if requested_access_mode is not null and not public.is_app_owner() then
    raise exception 'Only app owners may configure category access' using errcode = '42501';
  end if;

  insert into public.work_groups (
    name, description, color, links, tags, created_by
  ) values (
    requested_name,
    requested_description,
    requested_color,
    coalesce(requested_links, '[]'::jsonb),
    coalesce(requested_tags, '{}'::text[]),
    auth.uid()
  ) returning * into category_row;

  insert into public.category_owners (category_id, profile_id)
  select category_row.id, owner_id
  from (select distinct unnest(normalized_owner_ids) owner_id) owners;

  if requested_access_mode is not null then
    perform set_config('app.suppress_workspace_activity', 'true', true);
    perform public.set_category_access(
      category_row.id,
      requested_access_mode,
      coalesce(requested_group_ids, '{}'::uuid[])
    );
    perform set_config('app.suppress_workspace_activity', 'false', true);
    select * into category_row from public.work_groups where id = category_row.id;
  end if;

  return next category_row;
end;
$function$;

create or replace function public.update_category_with_owners(
  requested_category_id uuid,
  requested_values jsonb
)
returns setof public.work_groups
language plpgsql
security definer
set search_path to ''
as $function$
declare
  category_row public.work_groups;
  normalized_owner_ids uuid[];
  previous_owner_ids uuid[];
  owner_detail text;
begin
  if not public.can_manage_categories() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if requested_values ? 'ownerIds' then
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into normalized_owner_ids
    from jsonb_array_elements_text(requested_values -> 'ownerIds');
    if cardinality(normalized_owner_ids) = 0 then
      raise exception 'A category requires at least one owner' using errcode = 'RS001';
    end if;
    if exists (
      select 1 from unnest(normalized_owner_ids) owner_id
      where not exists (
        select 1 from public.profiles profile
        where profile.id = owner_id and profile.onboarding_completed
      )
    ) then
      raise exception 'A selected category owner is not eligible' using errcode = 'RS001';
    end if;
  end if;

  update public.work_groups
  set
    name = case when requested_values ? 'name' then requested_values ->> 'name' else name end,
    description = case when requested_values ? 'description' then requested_values ->> 'description' else description end,
    color = case when requested_values ? 'color' then requested_values ->> 'color' else color end,
    links = case when requested_values ? 'links' then requested_values -> 'links' else links end,
    tags = case when requested_values ? 'tags' then
      array(select jsonb_array_elements_text(requested_values -> 'tags')) else tags end,
    archived_at = case when requested_values ? 'archived' then
      case when (requested_values ->> 'archived')::boolean then now() else null end
      else archived_at end
  where id = requested_category_id
  returning * into category_row;

  if category_row.id is null then
    raise exception 'Category not found' using errcode = 'P0002';
  end if;

  if normalized_owner_ids is not null then
    select coalesce(array_agg(profile_id), '{}'::uuid[])
    into previous_owner_ids
    from public.category_owners
    where category_id = requested_category_id;

    delete from public.category_owners where category_id = requested_category_id;
    insert into public.category_owners (category_id, profile_id)
    select requested_category_id, owner_id
    from (select distinct unnest(normalized_owner_ids) owner_id) owners;

    owner_detail := public.owner_change_detail(
      previous_owner_ids, normalized_owner_ids
    );
    if owner_detail is not null then
      insert into public.permission_audit_events (
        actor_id, action, target_type, target_id, before_state, after_state
      ) values (
        auth.uid(),
        'category.owners.update',
        'category',
        requested_category_id,
        null,
        jsonb_build_object(
          'activity', true,
          'resource_name', category_row.name,
          'resource_href', '/categories',
          'detail', owner_detail
        )
      );
    end if;
  end if;

  return next category_row;
end;
$function$;

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
        and not access_group.grants_global_content
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
$function$
;

CREATE OR REPLACE FUNCTION "public"."set_category_access"("requested_category_id" "uuid", "requested_access_mode" "text", "requested_group_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
      select 1 from public.access_groups
      where id = requested_group_id and not grants_global_content
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
    from unnest(coalesce(requested_group_ids, '{}'::uuid[])) requested_group_id;
  end if;
end;
$$;
