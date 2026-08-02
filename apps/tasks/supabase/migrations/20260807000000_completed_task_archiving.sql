alter table public.statuses
  add column is_completed boolean not null default false;

update public.statuses
set is_completed = true
where lower(name) = 'done';

alter table public.tasks
  add column completed_at timestamptz,
  add column archived_at timestamptz;

create function public.set_task_completion_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  status_is_completed boolean;
begin
  select is_completed
  into status_is_completed
  from public.statuses
  where id = new.status_id;

  if status_is_completed then
    if new.completed_at is null then
      new.completed_at = now();
    end if;
    if new.archived_at is null then
      new.archived_at = new.completed_at + interval '14 days';
    end if;
  else
    new.completed_at = null;
    new.archived_at = null;
  end if;

  return new;
end;
$$;

create trigger tasks_completion_lifecycle
before insert or update of status_id on public.tasks
for each row execute function public.set_task_completion_lifecycle();

update public.tasks as task
set completed_at = task.updated_at,
    archived_at = task.updated_at + interval '14 days'
from public.statuses as status
where task.status_id = status.id
  and status.is_completed;

create function public.refresh_tasks_for_status_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_completed is distinct from new.is_completed then
    update public.tasks
    set status_id = status_id
    where status_id = new.id;
  end if;
  return new;
end;
$$;

create trigger statuses_refresh_task_completion
after update of is_completed on public.statuses
for each row execute function public.refresh_tasks_for_status_completion();
