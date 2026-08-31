-- Pasting a checklist writes every item and its activity row in one transaction.
--
-- The single-item RPC records one activity row per item, which reads correctly
-- when someone types items one at a time. A paste is one gesture, so it records
-- one summary row instead of filling the feed with near-identical entries.

create or replace function public.create_subtasks_with_activity(
  parent_task_id uuid,
  requested_items jsonb
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  item jsonb;
  item_count integer;
  item_title text;
  saved_activity public.task_activity;
begin
  if jsonb_typeof(requested_items) <> 'array' then
    raise exception 'Invalid checklist items';
  end if;
  item_count := jsonb_array_length(requested_items);
  if item_count < 1 or item_count > 100 then
    raise exception 'A checklist paste must hold between 1 and 100 items';
  end if;

  for item in select value from jsonb_array_elements(requested_items) loop
    item_title := btrim(item ->> 'title');
    if item_title is null or char_length(item_title) = 0 then
      raise exception 'A checklist item cannot be empty';
    end if;
    insert into public.subtasks (
      id, task_id, title, is_completed, sort_order, created_by
    ) values (
      (item ->> 'id')::uuid,
      parent_task_id,
      item_title,
      coalesce((item ->> 'completed')::boolean, false),
      coalesce((item ->> 'sort_order')::integer, 0),
      auth.uid()
    );
  end loop;

  insert into public.task_activity (task_id, actor_id, action, details)
  values (
    parent_task_id,
    auth.uid(),
    format('added %s checklist items', item_count),
    jsonb_build_object('checklist_item_count', item_count)
  )
  returning * into saved_activity;

  return jsonb_build_object(
    'subtasks', coalesce((
      select jsonb_agg(to_jsonb(subtask) order by subtask.sort_order)
      from public.subtasks subtask
      where subtask.task_id = parent_task_id
        and subtask.id in (
          select (value ->> 'id')::uuid
          from jsonb_array_elements(requested_items)
        )
    ), '[]'::jsonb),
    'activity', to_jsonb(saved_activity)
  );
end;
$function$;

revoke all on function public.create_subtasks_with_activity(uuid, jsonb) from public;
grant execute on function public.create_subtasks_with_activity(uuid, jsonb)
  to authenticated, service_role;
