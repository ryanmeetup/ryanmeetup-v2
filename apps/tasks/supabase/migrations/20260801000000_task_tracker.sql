create type public.team_role as enum ('admin', 'member');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  role public.team_role not null default 'member'
);
create table public.statuses (
  id uuid primary key default gen_random_uuid(), name text not null unique, color text not null,
  sort_order integer not null, is_default boolean not null default false
);
create table public.work_groups (
  id uuid primary key default gen_random_uuid(), name text not null unique, color text not null,
  created_by uuid not null references public.profiles(id)
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), title text not null check (char_length(trim(title)) > 0), description text,
  status_id uuid not null references public.statuses(id), work_group_id uuid references public.work_groups(id) on delete set null,
  assignee_id uuid references public.profiles(id) on delete set null, created_by uuid not null references public.profiles(id),
  start_date date, due_date date, priority public.task_priority not null default 'medium',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint valid_date_range check (due_date is null or start_date is null or due_date >= start_date)
);

create function public.is_team_member() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger auth_user_profile after insert on auth.users for each row execute function public.handle_new_user();
create trigger tasks_updated_at before update on public.tasks for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.statuses enable row level security;
alter table public.work_groups enable row level security;
alter table public.tasks enable row level security;
create policy "team reads profiles" on public.profiles for select using (public.is_team_member());
create policy "team reads statuses" on public.statuses for select using (public.is_team_member());
create policy "admins manage statuses" on public.statuses for all using (public.is_admin()) with check (public.is_admin());
create policy "team reads groups" on public.work_groups for select using (public.is_team_member());
create policy "admins manage groups" on public.work_groups for all using (public.is_admin()) with check (public.is_admin());
create policy "team reads tasks" on public.tasks for select using (public.is_team_member());
create policy "team creates tasks" on public.tasks for insert with check (public.is_team_member() and created_by = auth.uid());
create policy "team updates tasks" on public.tasks for update using (public.is_team_member()) with check (public.is_team_member());
create policy "team deletes tasks" on public.tasks for delete using (public.is_team_member());

insert into public.statuses (name, color, sort_order, is_default) values
  ('Backlog', '#64748b', 0, true), ('Todo', '#2563eb', 1, true), ('In Progress', '#d97706', 2, true),
  ('In Review', '#7c3aed', 3, true), ('Done', '#059669', 4, true);
alter publication supabase_realtime add table public.tasks;
