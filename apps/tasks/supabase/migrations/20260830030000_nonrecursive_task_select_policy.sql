-- INSERT ... RETURNING also evaluates the SELECT policy. Calling
-- can_view_task(id) there re-queries the row being inserted and can evaluate
-- to null before RETURNING exposes it, incorrectly rejecting an allowed
-- insert. Evaluate project access from the policy row itself instead.
drop policy if exists "members view accessible tasks" on public.tasks;
create policy "members view accessible tasks"
on public.tasks for select
using (
  (
    (project_id is null and public.is_team_member())
    or public.can_view_project(project_id)
  )
  and public.can_access_task_categories(id)
);

notify pgrst, 'reload schema';
