create or replace function public.move_task(
  moved_task_id uuid,
  next_status_id uuid,
  next_board_position double precision
)
returns public.tasks
language plpgsql security invoker set search_path = '' as $$
declare
  saved public.tasks;
  previous_status_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authorized'; end if;
  if not (next_board_position between -1000000000000000 and 1000000000000000) then
    raise exception 'Invalid board position';
  end if;

  select status_id into previous_status_id
  from public.tasks
  where id = moved_task_id
  for update;

  update public.tasks
  set status_id = next_status_id, board_position = next_board_position
  where id = moved_task_id returning * into saved;
  if saved.id is null then raise exception 'Task not found'; end if;

  insert into public.task_activity(task_id, actor_id, action, details)
  values (
    saved.id,
    auth.uid(),
    'moved task',
    jsonb_build_object(
      'from_status_id', previous_status_id,
      'status_id', next_status_id
    )
  );
  return saved;
end; $$;

grant execute on function public.move_task(uuid, uuid, double precision) to authenticated;
