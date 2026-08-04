create or replace function public.save_task(
  task_id uuid,
  task_values jsonb,
  category_ids uuid[],
  assignee_ids uuid[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_task public.tasks;
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;
  if coalesce(array_length(category_ids, 1), 0) = 0 then
    raise exception 'Select at least one category';
  end if;

  if task_id is null then
    insert into public.tasks (
      title, description, status_id, work_group_id, project_id, assignee_id,
      created_by, start_date, due_date, due_time, reminder_at, priority
    ) values (
      trim(task_values ->> 'title'), nullif(task_values ->> 'description', ''),
      (task_values ->> 'status_id')::uuid,
      nullif(task_values ->> 'work_group_id', '')::uuid,
      nullif(task_values ->> 'project_id', '')::uuid,
      nullif(task_values ->> 'assignee_id', '')::uuid,
      auth.uid(), nullif(task_values ->> 'start_date', '')::date,
      nullif(task_values ->> 'due_date', '')::date,
      nullif(task_values ->> 'due_time', '')::time,
      nullif(task_values ->> 'reminder_at', '')::timestamptz,
      (task_values ->> 'priority')::public.task_priority
    ) returning * into saved_task;
  else
    update public.tasks set
      title = trim(task_values ->> 'title'),
      description = nullif(task_values ->> 'description', ''),
      status_id = (task_values ->> 'status_id')::uuid,
      work_group_id = nullif(task_values ->> 'work_group_id', '')::uuid,
      project_id = nullif(task_values ->> 'project_id', '')::uuid,
      assignee_id = nullif(task_values ->> 'assignee_id', '')::uuid,
      start_date = nullif(task_values ->> 'start_date', '')::date,
      due_date = nullif(task_values ->> 'due_date', '')::date,
      due_time = nullif(task_values ->> 'due_time', '')::time,
      reminder_at = nullif(task_values ->> 'reminder_at', '')::timestamptz,
      priority = (task_values ->> 'priority')::public.task_priority
    where id = task_id
    returning * into saved_task;
    if saved_task.id is null then raise exception 'Task not found'; end if;
  end if;

  delete from public.task_assignees where task_assignees.task_id = saved_task.id;
  insert into public.task_assignees (task_id, profile_id)
  select saved_task.id, id from unnest(coalesce(assignee_ids, '{}'::uuid[])) id;
  delete from public.task_categories where task_categories.task_id = saved_task.id;
  insert into public.task_categories (task_id, category_id)
  select saved_task.id, id from unnest(category_ids) id;

  return jsonb_build_object(
    'task', to_jsonb(saved_task),
    'assignees', coalesce((select jsonb_agg(to_jsonb(a)) from public.task_assignees a where a.task_id = saved_task.id), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(c)) from public.task_categories c where c.task_id = saved_task.id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.create_subtask_with_activity(
  subtask_id uuid,
  parent_task_id uuid,
  subtask_title text,
  subtask_sort_order integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_subtask public.subtasks;
  saved_activity public.task_activity;
begin
  insert into public.subtasks (id, task_id, title, sort_order, created_by)
  values (subtask_id, parent_task_id, trim(subtask_title), subtask_sort_order, auth.uid())
  returning * into saved_subtask;
  insert into public.task_activity (task_id, actor_id, action, details)
  values (parent_task_id, auth.uid(), format('added checklist item “%s”', trim(subtask_title)), '{}'::jsonb)
  returning * into saved_activity;
  return jsonb_build_object('subtask', to_jsonb(saved_subtask), 'activity', to_jsonb(saved_activity));
end;
$$;

grant execute on function public.save_task(uuid, jsonb, uuid[], uuid[]) to authenticated;
grant execute on function public.create_subtask_with_activity(uuid, uuid, text, integer) to authenticated;
