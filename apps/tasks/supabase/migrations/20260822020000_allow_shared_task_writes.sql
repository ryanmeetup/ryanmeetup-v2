-- Projectless tasks are the shared workspace. Onboarded members may manage
-- them, while tasks attached to a project continue to require an explicit
-- editor or manager grant.
create or replace function public.can_edit_task(requested_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when project_id is null then public.is_team_member()
    else public.can_edit_project(project_id)
  end
  from public.tasks
  where id = requested_task_id;
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
        requested_project_id is null
        or p.app_role = 'owner'
        or exists (
          select 1
          from public.access_group_members m
          join public.project_group_grants g on g.group_id = m.group_id
          where m.profile_id = p.id and g.project_id = requested_project_id
        )
      )
  );
$$;

drop policy if exists "editors create tasks" on public.tasks;
create policy "editors create tasks" on public.tasks for insert with check (
  (
    (project_id is null and public.is_team_member())
    or public.can_edit_project(project_id)
  )
  and created_by = auth.uid()
  and (assignee_id is null or public.can_assign_to_project(assignee_id, project_id))
);

drop policy if exists "editors update tasks" on public.tasks;
create policy "editors update tasks" on public.tasks for update using (
  (project_id is null and public.is_team_member())
  or public.can_edit_project(project_id)
) with check (
  (
    (project_id is null and public.is_team_member())
    or public.can_edit_project(project_id)
  )
  and (assignee_id is null or public.can_assign_to_project(assignee_id, project_id))
);

drop policy if exists "editors delete tasks" on public.tasks;
create policy "editors delete tasks" on public.tasks for delete using (
  (project_id is null and public.is_team_member())
  or public.can_edit_project(project_id)
);

notify pgrst, 'reload schema';
