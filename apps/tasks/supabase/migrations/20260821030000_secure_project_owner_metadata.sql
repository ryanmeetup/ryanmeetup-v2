-- Project owners describe work-stream responsibility only. Keep the metadata
-- inside the same project boundary as the project it describes.
drop policy if exists "team manages project owner metadata" on public.project_owners;

create policy "members view accessible project owner metadata"
on public.project_owners for select
using (public.can_view_project(project_id));

create policy "managers add eligible project owner metadata"
on public.project_owners for insert
with check (
  public.can_manage_project(project_id)
  and public.can_assign_to_project(profile_id, project_id)
);

create policy "managers update eligible project owner metadata"
on public.project_owners for update
using (public.can_manage_project(project_id))
with check (
  public.can_manage_project(project_id)
  and public.can_assign_to_project(profile_id, project_id)
);

create policy "managers delete project owner metadata"
on public.project_owners for delete
using (public.can_manage_project(project_id));
