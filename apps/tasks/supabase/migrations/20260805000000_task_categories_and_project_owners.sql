create table public.task_categories (
  task_id uuid not null references public.tasks(id) on delete cascade,
  category_id uuid not null references public.work_groups(id) on delete cascade,
  primary key (task_id, category_id)
);

insert into public.task_categories (task_id, category_id)
select id, work_group_id from public.tasks where work_group_id is not null
on conflict do nothing;

create table public.project_owners (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (project_id, profile_id)
);

alter table public.task_categories enable row level security;
alter table public.project_owners enable row level security;

create policy "team manages task categories"
on public.task_categories for all
using (public.is_team_member())
with check (public.is_team_member());

create policy "team manages project owners"
on public.project_owners for all
using (public.is_team_member())
with check (public.is_team_member());

alter publication supabase_realtime add table public.task_categories;
alter publication supabase_realtime add table public.project_owners;
