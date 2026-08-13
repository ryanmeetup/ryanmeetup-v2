alter table public.work_groups
add column tags text[] not null default '{}'::text[];

alter table public.tasks
add column category_tags jsonb not null default '{}'::jsonb,
add constraint category_tags_is_object check (jsonb_typeof(category_tags) = 'object');

create function public.prune_removed_category_tags()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.tags is distinct from new.tags then
    update public.tasks
    set category_tags = jsonb_set(
      category_tags,
      array[new.id::text],
      coalesce(
        (
          select jsonb_agg(value)
          from jsonb_array_elements_text(category_tags -> new.id::text) selected(value)
          where selected.value = any(new.tags)
        ),
        '[]'::jsonb
      )
    )
    where category_tags ? new.id::text;
  end if;
  return new;
end;
$$;

create trigger work_groups_prune_removed_tags
after update of tags on public.work_groups
for each row execute function public.prune_removed_category_tags();

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
  requested_tags jsonb := coalesce(task_values -> 'category_tags', '{}'::jsonb);
begin
  if auth.uid() is null then raise exception 'Not authorized'; end if;
  if coalesce(array_length(category_ids, 1), 0) = 0 then
    raise exception 'Select at least one category';
  end if;
  if jsonb_typeof(requested_tags) <> 'object' then
    raise exception 'Category tags must be an object';
  end if;
  if exists (
    select 1
    from jsonb_each(requested_tags) entry
    left join public.work_groups category on category.id::text = entry.key
    where category.id is null
      or not (category.id = any(category_ids))
      or jsonb_typeof(entry.value) <> 'array'
      or exists (
        select 1 from jsonb_array_elements_text(entry.value) chosen(tag)
        where not (chosen.tag = any(category.tags))
      )
  ) then
    raise exception 'A selected tag does not belong to its category';
  end if;

  if task_id is null then
    insert into public.tasks (
      title, description, status_id, work_group_id, project_id, assignee_id,
      created_by, reported_by, start_date, due_date, due_time, reminder_at,
      priority, category_tags
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
      (task_values ->> 'priority')::public.task_priority, requested_tags
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
      priority = (task_values ->> 'priority')::public.task_priority,
      category_tags = requested_tags
    where id = task_id returning * into saved_task;
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
