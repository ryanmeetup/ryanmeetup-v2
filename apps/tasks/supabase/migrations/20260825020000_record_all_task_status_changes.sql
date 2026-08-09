create or replace function public.log_task_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity (task_id, actor_id, action, details)
    values (new.id, auth.uid(), 'created the task', '{}'::jsonb);
  elsif old.status_id is distinct from new.status_id then
    insert into public.task_activity (task_id, actor_id, action, details)
    values (
      new.id,
      auth.uid(),
      'moved task',
      jsonb_build_object(
        'from_status_id', old.status_id,
        'status_id', new.status_id
      )
    );
  else
    insert into public.task_activity (task_id, actor_id, action, details)
    values (new.id, auth.uid(), 'updated the task', '{}'::jsonb);
  end if;
  return new;
end;
$$;

create or replace function public.move_task(
  moved_task_id uuid,
  next_status_id uuid,
  next_board_position double precision
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved public.tasks;
begin
  if auth.uid() is null then raise exception 'Not authorized'; end if;
  if not (next_board_position between -1000000000000000 and 1000000000000000) then
    raise exception 'Invalid board position';
  end if;

  update public.tasks
  set status_id = next_status_id, board_position = next_board_position
  where id = moved_task_id
  returning * into saved;
  if saved.id is null then raise exception 'Task not found'; end if;
  return saved;
end;
$$;

grant execute on function public.move_task(uuid, uuid, double precision)
to authenticated;
