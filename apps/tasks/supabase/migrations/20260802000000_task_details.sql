alter table public.tasks
  add column due_time time,
  add column reminder_at timestamptz;

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  is_completed boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  name text not null,
  url text not null,
  file_path text,
  mime_type text,
  size_bytes bigint,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.labels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null,
  created_by uuid not null references public.profiles(id)
);
create table public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (task_id, profile_id)
);
create table public.task_labels (
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (task_id, label_id)
);

create or replace function public.log_task_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.task_activity (task_id, actor_id, action, details)
  values (new.id, auth.uid(), case when tg_op = 'INSERT' then 'created the task' else 'updated the task' end, '{}'::jsonb);
  return new;
end;
$$;
create trigger task_activity_log after insert or update on public.tasks for each row execute function public.log_task_change();

alter table public.subtasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_activity enable row level security;
alter table public.task_attachments enable row level security;
alter table public.labels enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_labels enable row level security;

create policy "team manages subtasks" on public.subtasks for all using (public.is_team_member()) with check (public.is_team_member() and created_by = auth.uid());
create policy "team manages comments" on public.task_comments for all using (public.is_team_member()) with check (public.is_team_member() and created_by = auth.uid());
create policy "team reads activity" on public.task_activity for select using (public.is_team_member());
create policy "team adds activity" on public.task_activity for insert with check (public.is_team_member() and actor_id = auth.uid());
create policy "team manages attachments" on public.task_attachments for all using (public.is_team_member()) with check (public.is_team_member() and created_by = auth.uid());
create policy "team manages labels" on public.labels for all using (public.is_team_member()) with check (public.is_team_member() and created_by = auth.uid());
create policy "team manages task assignees" on public.task_assignees for all using (public.is_team_member()) with check (public.is_team_member());
create policy "team manages task labels" on public.task_labels for all using (public.is_team_member()) with check (public.is_team_member());

insert into storage.buckets (id, name, public) values ('task-attachments', 'task-attachments', false) on conflict (id) do update set public = false;
create policy "team uploads task files" on storage.objects for insert with check (bucket_id = 'task-attachments' and public.is_team_member());
create policy "team reads task files" on storage.objects for select using (bucket_id = 'task-attachments' and public.is_team_member());
create policy "team deletes task files" on storage.objects for delete using (bucket_id = 'task-attachments' and public.is_team_member());

insert into public.task_assignees (task_id, profile_id)
select id, assignee_id from public.tasks where assignee_id is not null on conflict do nothing;

alter publication supabase_realtime add table public.subtasks;
alter publication supabase_realtime add table public.task_comments;
alter publication supabase_realtime add table public.task_activity;
alter publication supabase_realtime add table public.task_attachments;
alter publication supabase_realtime add table public.task_assignees;
alter publication supabase_realtime add table public.task_labels;
