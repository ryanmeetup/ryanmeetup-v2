drop policy if exists "admins manage statuses" on public.statuses;
drop policy if exists "admins manage groups" on public.work_groups;

create policy "team manages statuses"
on public.statuses for all
using (public.is_team_member())
with check (public.is_team_member());

create policy "team manages groups"
on public.work_groups for all
using (public.is_team_member())
with check (public.is_team_member());

drop policy if exists "team manages subtasks" on public.subtasks;
drop policy if exists "team manages comments" on public.task_comments;
drop policy if exists "team manages attachments" on public.task_attachments;
drop policy if exists "team manages labels" on public.labels;

create policy "team manages subtasks"
on public.subtasks for all
using (public.is_team_member())
with check (public.is_team_member());

create policy "team manages comments"
on public.task_comments for all
using (public.is_team_member())
with check (public.is_team_member());

create policy "team manages attachments"
on public.task_attachments for all
using (public.is_team_member())
with check (public.is_team_member());

create policy "team manages labels"
on public.labels for all
using (public.is_team_member())
with check (public.is_team_member());

drop function if exists public.is_admin();
alter table public.profiles drop column if exists role;
drop type if exists public.team_role;
