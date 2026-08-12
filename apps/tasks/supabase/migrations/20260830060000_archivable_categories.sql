alter table public.work_groups
add column if not exists archived_at timestamptz;

create index if not exists work_groups_archived_at_idx
on public.work_groups(archived_at);
