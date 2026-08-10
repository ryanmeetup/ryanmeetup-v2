-- App owners must always be able to create content. Keep the normal member
-- eligibility checks for everyone else, but make the owner override explicit
-- at the row policy boundary instead of relying on inherited group behavior.
drop policy if exists "editors create tasks" on public.tasks;
create policy "editors create tasks"
on public.tasks for insert
with check (
  public.is_app_owner()
  or (
    (
      (project_id is null and public.is_team_member())
      or public.can_edit_project(project_id)
    )
    and created_by = auth.uid()
    and (
      assignee_id is null
      or public.can_assign_to_project(assignee_id, project_id)
    )
  )
);

notify pgrst, 'reload schema';
