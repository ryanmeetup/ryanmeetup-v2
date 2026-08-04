-- Tasks without a project belong to the shared workspace. Every onboarded
-- member can read them and their related records, while project-based edit
-- permissions remain unchanged.
create or replace function public.access_control_enabled()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where app_role = 'owner')
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

create or replace function public.can_view_task(requested_task_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when project_id is null then public.is_team_member()
    else public.can_view_project(project_id)
  end
  from public.tasks
  where id = requested_task_id;
$$;

drop policy if exists "members view accessible tasks" on public.tasks;
create policy "members view accessible tasks" on public.tasks for select using (
  (project_id is null and public.is_team_member())
  or public.can_view_project(project_id)
);

notify pgrst, 'reload schema';
