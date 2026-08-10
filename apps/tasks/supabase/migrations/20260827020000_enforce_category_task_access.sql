-- Apply category restrictions to task rows themselves. Related task records
-- already delegate authorization to can_view_task/can_edit_task.
drop policy if exists "members view accessible tasks" on public.tasks;
create policy "members view accessible tasks"
on public.tasks for select
using (public.can_view_task(id));

drop policy if exists "editors update tasks" on public.tasks;
create policy "editors update tasks"
on public.tasks for update
using (public.can_edit_task(id))
with check (
  (
    (project_id is null and public.is_team_member())
    or public.can_edit_project(project_id)
  )
  and public.can_access_task_categories(id)
  and (assignee_id is null or public.can_assign_to_project(assignee_id, project_id))
);

drop policy if exists "editors delete tasks" on public.tasks;
create policy "editors delete tasks"
on public.tasks for delete
using (public.can_edit_task(id));

notify pgrst, 'reload schema';
