-- One task, several people.
--
-- `task_assignees` has existed since the baseline schema, but only ever held a
-- mirror of `tasks.assignee_id`: the app wrote one row per task and read the
-- column back. Two places recording the same fact meant the join table could
-- never hold a second person without disagreeing with the column.
--
-- The join table wins. It already has the row-level policy that decides who
-- may be assigned to a task in a project, and it is already published to
-- realtime. The legacy column remains synchronized to one deterministic
-- assignee for this release so an older server or rollback can still read the
-- task while deployments move over. A later migration can remove it after
-- both instances have run the relation-only code safely.

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------

-- `save_task` kept the two in step, so this is normally a no-op. Rows written
-- before that, or by a direct database edit, are what it is here for.
insert into public.task_assignees (task_id, profile_id)
select id, assignee_id from public.tasks where assignee_id is not null
on conflict do nothing;

-- New application code can land before this migration and already write
-- several relation rows while the old save function clears the legacy column.
-- Rebuild the compatibility value from the complete relation, not only from
-- the older column-to-relation backfill above.
update public.tasks task
set assignee_id = (
  select assignment.profile_id
  from public.task_assignees assignment
  where assignment.task_id = task.id
  order by assignment.profile_id
  limit 1
)
where task.assignee_id is distinct from (
  select assignment.profile_id
  from public.task_assignees assignment
  where assignment.task_id = task.id
  order by assignment.profile_id
  limit 1
);

-- ---------------------------------------------------------------------------
-- save_task
-- ---------------------------------------------------------------------------

-- `assignee_ids` was already a parameter; it is now the source of truth.
-- `tasks.assignee_id` mirrors the first UUID in stable order temporarily for
-- rollback compatibility, while every current read uses `task_assignees`.
--
-- The one thing the column gave away for free was activity. `log_task_change`
-- fires on the `tasks` row, so a save that only changes who is assigned now
-- updates nothing the trigger can see. This records that row itself, and only
-- when the trigger did not already write one -- a save that also edited a
-- field describes both changes on the single row it wrote.
create or replace function public.save_task(
  task_id uuid,
  task_values jsonb,
  category_ids uuid[],
  assignee_ids uuid[],
  status_reason text default null
) returns jsonb
    language plpgsql
    set search_path to ''
    as $function$
declare
  saved_task public.tasks;
  requested_tags jsonb := coalesce(task_values -> 'category_tags', '{}'::jsonb);
  next_status public.statuses;
  previous_status_id uuid;
  trimmed_reason text := nullif(btrim(coalesce(status_reason, '')), '');
  reason_required boolean;
  recorded_activity_id text;
  previous_assignees uuid[];
  next_assignees uuid[];
  previous_categories uuid[];
  next_categories uuid[];
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

  select * into next_status
  from public.statuses
  where id = (task_values ->> 'status_id')::uuid;
  if next_status.id is null then raise exception 'Status not found'; end if;

  if task_id is not null then
    select tasks.status_id into previous_status_id
    from public.tasks where tasks.id = task_id;
  end if;
  -- Editing a task that already sits in the status keeps its original reason.
  reason_required := next_status.requires_reason
    and previous_status_id is distinct from next_status.id;
  if reason_required and trimmed_reason is null then
    raise exception 'Add a reason before moving this task to %.', next_status.name
      using errcode = 'TK001';
  end if;

  -- An earlier statement in this transaction may have left an id behind.
  perform set_config('app.last_task_update_activity_id', '', true);

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
      (select id from unnest(coalesce(assignee_ids, '{}'::uuid[])) id order by id limit 1),
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
      assignee_id = (select id from unnest(coalesce(assignee_ids, '{}'::uuid[])) id order by id limit 1),
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

  select coalesce(array_agg(profile_id order by profile_id), '{}'::uuid[])
    into previous_assignees
    from public.task_assignees where task_assignees.task_id = saved_task.id;
  delete from public.task_assignees where task_assignees.task_id = saved_task.id;
  insert into public.task_assignees (task_id, profile_id)
  select distinct saved_task.id, id from unnest(coalesce(assignee_ids, '{}'::uuid[])) id;
  select coalesce(array_agg(profile_id order by profile_id), '{}'::uuid[])
    into next_assignees
    from public.task_assignees where task_assignees.task_id = saved_task.id;

  select coalesce(array_agg(category_id order by category_id), '{}'::uuid[])
    into previous_categories
    from public.task_categories where task_categories.task_id = saved_task.id;
  delete from public.task_categories where task_categories.task_id = saved_task.id;
  insert into public.task_categories (task_id, category_id)
  select saved_task.id, id from unnest(category_ids) id;
  select coalesce(array_agg(category_id order by category_id), '{}'::uuid[])
    into next_categories
    from public.task_categories where task_categories.task_id = saved_task.id;

  if reason_required then
    insert into public.task_comments (task_id, body, created_by)
    values (saved_task.id, trimmed_reason, auth.uid());
  end if;

  recorded_activity_id := nullif(
    coalesce(current_setting('app.last_task_update_activity_id', true), ''), ''
  );
  -- A new task is already described by its own `created the task` row.
  if task_id is not null
    and recorded_activity_id is null
    and (
      previous_assignees is distinct from next_assignees
      or previous_categories is distinct from next_categories
    )
  then
    insert into public.task_activity (task_id, actor_id, action, details)
    values (saved_task.id, auth.uid(), 'updated the task', '{}'::jsonb)
    returning id::text into recorded_activity_id;
  end if;

  return jsonb_build_object(
    'task', to_jsonb(saved_task),
    'activity_id', recorded_activity_id,
    'assignees', coalesce((select jsonb_agg(to_jsonb(a)) from public.task_assignees a where a.task_id = saved_task.id), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(c)) from public.task_categories c where c.task_id = saved_task.id), '[]'::jsonb)
  );
end;
$function$;

alter function public.save_task(uuid, jsonb, uuid[], uuid[], text) owner to postgres;
revoke all on function public.save_task(uuid, jsonb, uuid[], uuid[], text) from public;
grant all on function public.save_task(uuid, jsonb, uuid[], uuid[], text) to authenticated;
grant all on function public.save_task(uuid, jsonb, uuid[], uuid[], text) to service_role;
