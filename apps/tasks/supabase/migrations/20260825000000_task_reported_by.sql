alter table public.tasks
add column reported_by uuid references public.profiles(id);

update public.tasks
set reported_by = created_by
where reported_by is null;

alter table public.tasks
alter column reported_by set not null;

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
      created_by, reported_by, start_date, due_date, due_time, reminder_at,
      priority
    ) values (
      trim(task_values ->> 'title'), nullif(task_values ->> 'description', ''),
      (task_values ->> 'status_id')::uuid,
      nullif(task_values ->> 'work_group_id', '')::uuid,
      nullif(task_values ->> 'project_id', '')::uuid,
      nullif(task_values ->> 'assignee_id', '')::uuid,
      auth.uid(), (task_values ->> 'reported_by')::uuid,
      nullif(task_values ->> 'start_date', '')::date,
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
      reported_by = (task_values ->> 'reported_by')::uuid,
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
