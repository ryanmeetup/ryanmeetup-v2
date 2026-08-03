-- Project visibility is granted only through access groups. The old direct
-- grant table remains temporarily for rollback and compatibility with the
-- previously deployed client, but no authorization function reads it.
comment on table public.project_user_grants is
  'Legacy rollback data. Direct grants do not contribute to project access.';

create or replace function public.access_control_enabled()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where app_role = 'owner')
    and not exists (select 1 from public.tasks where project_id is null)
    and not exists (
      select 1 from public.task_attachments
      where file_path is not null
        and file_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/'
    )
    and not exists (
      select 1 from public.projects p
      where not exists (
        select 1 from public.project_group_grants g where g.project_id = p.id
      )
    );
$$;

create or replace function public.project_permission_for(requested_project_id uuid)
returns public.project_permission language sql stable security definer set search_path = '' as $$
  select case
    when public.is_app_owner() then 'manager'::public.project_permission
    when not public.access_control_enabled() and public.is_team_member()
      then 'manager'::public.project_permission
    else (
      select case max(permission_rank)
        when 3 then 'manager'::public.project_permission
        when 2 then 'editor'::public.project_permission
        when 1 then 'viewer'::public.project_permission
      end
      from (
        select case pgg.permission when 'manager' then 3 when 'editor' then 2 else 1 end permission_rank
        from public.project_group_grants pgg
        join public.access_group_members agm on agm.group_id = pgg.group_id
        where pgg.project_id = requested_project_id and agm.profile_id = auth.uid()
      ) grants
    )
  end;
$$;

create or replace function public.can_assign_to_project(requested_profile_id uuid, requested_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = requested_profile_id and p.onboarding_completed
      and (
        p.app_role = 'owner'
        or exists (
          select 1 from public.access_group_members m
          join public.project_group_grants g on g.group_id = m.group_id
          where m.profile_id = p.id and g.project_id = requested_project_id
        )
        or not public.access_control_enabled()
      )
  );
$$;

notify pgrst, 'reload schema';
