create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) > 0),
  created_by uuid not null references public.profiles(id),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.tasks
  add column project_id uuid references public.projects(id) on delete set null;

alter table public.projects enable row level security;

create policy "team manages projects"
on public.projects for all
using (public.is_team_member())
with check (public.is_team_member() and created_by = auth.uid());

alter publication supabase_realtime add table public.projects;
