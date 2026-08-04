alter table public.tasks add column board_position double precision;

with ranked_tasks as (
  select
    id,
    row_number() over (
      partition by status_id
      order by updated_at desc, id
    ) * 1024 as position
  from public.tasks
)
update public.tasks
set board_position = ranked_tasks.position
from ranked_tasks
where public.tasks.id = ranked_tasks.id;

alter table public.tasks alter column board_position set not null;

create index tasks_status_board_position_idx
on public.tasks(status_id, board_position);

create or replace function public.assign_task_board_position()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.board_position is null then
    select coalesce(max(task.board_position), 0) + 1024
    into new.board_position
    from public.tasks task
    where task.status_id = new.status_id;
  end if;

  return new;
end;
$$;

create trigger tasks_assign_board_position
before insert on public.tasks
for each row execute function public.assign_task_board_position();
