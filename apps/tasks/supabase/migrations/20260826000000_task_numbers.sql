create sequence public.task_number_seq;

alter table public.tasks
add column task_number bigint;

with numbered_tasks as (
  select id, row_number() over (order by created_at, id) as task_number
  from public.tasks
)
update public.tasks
set task_number = numbered_tasks.task_number
from numbered_tasks
where tasks.id = numbered_tasks.id;

select setval(
  'public.task_number_seq',
  coalesce((select max(task_number) from public.tasks), 0) + 1,
  false
);

alter table public.tasks
alter column task_number set default nextval('public.task_number_seq'),
alter column task_number set not null,
add constraint tasks_task_number_key unique (task_number),
add constraint tasks_task_number_positive check (task_number > 0);

alter sequence public.task_number_seq owned by public.tasks.task_number;
