create table public.notes (
  id uuid primary key default gen_random_uuid(),
  title text check (title is null or char_length(title) <= 200),
  body text not null check (
    char_length(trim(body)) > 0 and char_length(body) <= 10000
  ),
  created_by uuid not null references public.profiles(id),
  converted_task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index notes_active_updated_at_idx
  on public.notes (updated_at desc)
  where archived_at is null;

create trigger notes_updated_at
  before update on public.notes
  for each row execute function public.touch_updated_at();

alter table public.notes enable row level security;

create policy "members read notes"
on public.notes for select
using (public.is_team_member());

create policy "members create notes"
on public.notes for insert
with check (
  public.is_team_member()
  and created_by = auth.uid()
  and converted_task_id is null
);

create policy "members update notes"
on public.notes for update
using (public.is_team_member())
with check (public.is_team_member());

create policy "members delete notes"
on public.notes for delete
using (public.is_team_member());
