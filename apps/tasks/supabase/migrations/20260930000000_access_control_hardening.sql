-- Make project visibility administration a distinct authority from project
-- content management, and remove anonymous access to private workspace helpers.

create or replace function public.can_administer_project_access(
  requested_project_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select public.is_team_member() and exists (
    select 1
    from public.projects project
    where project.id = requested_project_id
      and (
        public.is_app_owner()
        or exists (
          select 1
          from public.project_owners owner_row
          where owner_row.project_id = project.id
            and owner_row.profile_id = auth.uid()
        )
      )
  );
$function$;

comment on function public.can_administer_project_access(uuid) is
  'True only for app owners and the project''s named owners. Workspace-wide content management does not imply access-administration authority.';

revoke all on function public.can_administer_project_access(uuid) from public, anon;
grant execute on function public.can_administer_project_access(uuid) to authenticated, service_role;

create or replace function public.protect_project_access_mode()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if old.access_mode is distinct from new.access_mode
    and coalesce(current_setting('app.project_visibility_write', true), '') <> 'allowed'
  then
    raise exception 'Project visibility must be changed through set_project_visibility'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists projects_protect_access_mode on public.projects;
create trigger projects_protect_access_mode
before update of access_mode on public.projects
for each row execute function public.protect_project_access_mode();

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
  previous_access_mode text;
  previous_group_ids uuid[];
begin
  if not public.can_administer_project_access(requested_project_id) then
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
    select 1
    from unnest(normalized_group_ids) requested_group_id
    where not exists (
      select 1
      from public.access_groups access_group
      where access_group.id = requested_group_id
    )
  ) then
    raise exception 'An access group is not eligible for project visibility'
      using errcode = 'RS001';
  end if;

  select project.access_mode,
    coalesce(
      array_agg(grant_row.group_id order by grant_row.group_id)
        filter (where grant_row.group_id is not null),
      '{}'::uuid[]
    )
  into previous_access_mode, previous_group_ids
  from public.projects project
  left join public.project_group_grants grant_row
    on grant_row.project_id = project.id
  where project.id = requested_project_id
  group by project.access_mode;

  perform set_config('app.project_visibility_write', 'allowed', true);
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

  insert into public.permission_audit_events (
    actor_id,
    action,
    target_type,
    target_id,
    before_state,
    after_state
  ) values (
    auth.uid(),
    'project.visibility.update',
    'project',
    requested_project_id,
    jsonb_build_object(
      'access_mode', previous_access_mode,
      'group_ids', previous_group_ids
    ),
    jsonb_build_object(
      'access_mode', requested_access_mode,
      'group_ids', case
        when requested_access_mode = 'restricted'
          then to_jsonb(normalized_group_ids)
        else '[]'::jsonb
      end
    )
  );
end;
$function$;

revoke all on function public.set_project_visibility(uuid,text,uuid[]) from public, anon;
grant execute on function public.set_project_visibility(uuid,text,uuid[]) to authenticated, service_role;

-- Page restrictions are an independent boundary. Workspace-wide content
-- managers can be selected explicitly like any other tier, but only app owners
-- bypass a restricted page whose selected groups do not include them.
create or replace function public.can_view_workspace_area(requested_area text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select public.is_team_member() and (
    public.is_app_owner()
    or not exists (
      select 1
      from public.workspace_area_access area_row
      where area_row.area = requested_area
        and area_row.access_mode = 'restricted'
    )
    or exists (
      select 1
      from public.workspace_area_group_grants grant_row
      where grant_row.area = requested_area
        and public.member_has_group_access(auth.uid(), grant_row.group_id)
    )
  );
$function$;

revoke all on function public.can_view_workspace_area(text) from public, anon;
grant execute on function public.can_view_workspace_area(text) to authenticated, service_role;

-- The workspace is private. These predicates are callable by signed-in users
-- (and by policies), but exposing them through the anonymous PostgREST role is
-- unnecessary and makes private authorization metadata probeable.
revoke all on function public.can_access_category(uuid) from public, anon;
grant execute on function public.can_access_category(uuid) to authenticated, service_role;
revoke all on function public.can_access_task_categories(uuid) from public, anon;
grant execute on function public.can_access_task_categories(uuid) to authenticated, service_role;
revoke all on function public.can_assign_to_project(uuid,uuid) from public, anon;
grant execute on function public.can_assign_to_project(uuid,uuid) to authenticated, service_role;
revoke all on function public.can_edit_project(uuid) from public, anon;
grant execute on function public.can_edit_project(uuid) to authenticated, service_role;
revoke all on function public.can_edit_task(uuid) from public, anon;
grant execute on function public.can_edit_task(uuid) to authenticated, service_role;
revoke all on function public.can_manage_categories() from public, anon;
grant execute on function public.can_manage_categories() to authenticated, service_role;
revoke all on function public.can_manage_group_projects(uuid) from public, anon;
grant execute on function public.can_manage_group_projects(uuid) to authenticated, service_role;
revoke all on function public.can_manage_project(uuid) from public, anon;
grant execute on function public.can_manage_project(uuid) to authenticated, service_role;
revoke all on function public.can_view_project(uuid) from public, anon;
grant execute on function public.can_view_project(uuid) to authenticated, service_role;
revoke all on function public.can_view_task(uuid) from public, anon;
grant execute on function public.can_view_task(uuid) to authenticated, service_role;
revoke all on function public.can_view_workspace_calendar() from public, anon;
grant execute on function public.can_view_workspace_calendar() to authenticated, service_role;
revoke all on function public.has_global_content_access(uuid) from public, anon;
grant execute on function public.has_global_content_access(uuid) to authenticated, service_role;
revoke all on function public.is_access_group_member(uuid) from public, anon;
grant execute on function public.is_access_group_member(uuid) to authenticated, service_role;
revoke all on function public.is_app_owner() from public, anon;
grant execute on function public.is_app_owner() to authenticated, service_role;
revoke all on function public.is_team_member() from public, anon;
grant execute on function public.is_team_member() to authenticated, service_role;
revoke all on function public.member_has_group_access(uuid,uuid) from public, anon;
grant execute on function public.member_has_group_access(uuid,uuid) to authenticated, service_role;
revoke all on function public.project_permission_for(uuid) from public, anon;
grant execute on function public.project_permission_for(uuid) to authenticated, service_role;
revoke all on function public.set_profile_access_tier(uuid,uuid) from public, anon;
grant execute on function public.set_profile_access_tier(uuid,uuid) to authenticated, service_role;

-- Provisioning and repair intentionally allow service-role calls (including the
-- auth trigger running as their owner), not arbitrary unauthenticated RPCs.
revoke all on function public.provision_workspace_member(uuid,text,text) from public, anon, authenticated;
grant execute on function public.provision_workspace_member(uuid,text,text) to service_role;
revoke all on function public.beginner_flow_health() from public, anon, authenticated;
grant execute on function public.beginner_flow_health() to service_role;
revoke all on function public.repair_beginner_flow() from public, anon, authenticated;
grant execute on function public.repair_beginner_flow() to service_role;

-- These accept an actor or rate-limit key supplied by trusted server code and
-- therefore must not be callable as ordinary user RPCs.
revoke all on function public.record_privileged_audit_event(uuid,text,text,uuid,jsonb)
  from public, anon, authenticated;
grant execute on function public.record_privileged_audit_event(uuid,text,text,uuid,jsonb)
  to service_role;
revoke all on function public.consume_privileged_rate_limit(text,integer,integer)
  from public, anon, authenticated;
grant execute on function public.consume_privileged_rate_limit(text,integer,integer)
  to service_role;
