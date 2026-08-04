revoke execute on function public.save_task(uuid, jsonb, uuid[], uuid[]) from public, anon;
revoke execute on function public.create_subtask_with_activity(uuid, uuid, text, integer) from public, anon;

grant execute on function public.save_task(uuid, jsonb, uuid[], uuid[]) to authenticated;
grant execute on function public.create_subtask_with_activity(uuid, uuid, text, integer) to authenticated;
