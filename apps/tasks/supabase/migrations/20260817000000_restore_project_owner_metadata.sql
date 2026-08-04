-- Project owners describe work-stream responsibility only. They do not grant
-- project access; access remains controlled by project grants and groups.
drop policy if exists "owners read legacy project owners" on public.project_owners;

create policy "team manages project owner metadata"
on public.project_owners for all
using (public.is_team_member())
with check (public.is_team_member());
