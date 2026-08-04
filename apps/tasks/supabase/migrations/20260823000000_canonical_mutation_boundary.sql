-- Business mutations are invoked by server routes. RLS remains the final boundary,
-- while these functions own canonical timestamps, actors, and atomic audit activity.
create or replace function public.move_task(
  moved_task_id uuid,
  next_status_id uuid,
  next_board_position double precision
)
returns public.tasks
language plpgsql security invoker set search_path = '' as $$
declare saved public.tasks;
begin
  if auth.uid() is null then raise exception 'Not authorized'; end if;
  if not (next_board_position between -1000000000000000 and 1000000000000000) then
    raise exception 'Invalid board position';
  end if;
  update public.tasks
  set status_id = next_status_id, board_position = next_board_position
  where id = moved_task_id returning * into saved;
  if saved.id is null then raise exception 'Task not found'; end if;
  insert into public.task_activity(task_id, actor_id, action, details)
  values (saved.id, auth.uid(), 'moved task', jsonb_build_object('status_id', next_status_id));
  return saved;
end; $$;

create or replace function public.delete_task(deleted_task_id uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare removed_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authorized'; end if;
  delete from public.tasks where id = deleted_task_id returning id into removed_id;
  if removed_id is null then raise exception 'Task not found'; end if;
  return removed_id;
end; $$;

grant execute on function public.move_task(uuid, uuid, double precision) to authenticated;
grant execute on function public.delete_task(uuid) to authenticated;
