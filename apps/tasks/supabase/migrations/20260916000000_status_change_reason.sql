-- Statuses that demand an explanation before a task lands in them.
--
-- "Will Not Do" declines work, and a declined task with no explanation is a
-- decision nobody can review later. Rather than hardcode that one status, a
-- status now carries `requires_reason`: when a task moves into it, the mover
-- must say why, and that reason is written as the task's next comment inside
-- the same transaction as the status change. The default workflow turns it on
-- for "Will Not Do" only; owners can turn it on for any status they add.

alter table public.statuses
  add column if not exists requires_reason boolean not null default false;

update public.statuses
set requires_reason = true
where name = 'Will Not Do'
  and not requires_reason;

-- A task's reason lives in `task_comments`, so the status change and its
-- explanation succeed or fail together.
create or replace function public.save_task(
  task_id uuid,
  task_values jsonb,
  category_ids uuid[],
  assignee_ids uuid[],
  status_reason text default null
) returns jsonb
    language plpgsql
    set search_path to ''
    as $$
declare
  saved_task public.tasks;
  requested_tags jsonb := coalesce(task_values -> 'category_tags', '{}'::jsonb);
  next_status public.statuses;
  previous_status_id uuid;
  trimmed_reason text := nullif(btrim(coalesce(status_reason, '')), '');
  reason_required boolean;
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

  if reason_required then
    insert into public.task_comments (task_id, body, created_by)
    values (saved_task.id, trimmed_reason, auth.uid());
  end if;

  return jsonb_build_object(
    'task', to_jsonb(saved_task),
    'assignees', coalesce((select jsonb_agg(to_jsonb(a)) from public.task_assignees a where a.task_id = saved_task.id), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(c)) from public.task_categories c where c.task_id = saved_task.id), '[]'::jsonb)
  );
end;
$$;

alter function public.save_task(uuid, jsonb, uuid[], uuid[], text) owner to postgres;
revoke all on function public.save_task(uuid, jsonb, uuid[], uuid[], text) from public;
grant all on function public.save_task(uuid, jsonb, uuid[], uuid[], text) to authenticated;
grant all on function public.save_task(uuid, jsonb, uuid[], uuid[], text) to service_role;

-- The four-argument signature is replaced, not overloaded: leaving it callable
-- would leave a way to reach a required-reason status without one.
drop function if exists public.save_task(uuid, jsonb, uuid[], uuid[]);

create or replace function public.move_task(
  moved_task_id uuid,
  next_status_id uuid,
  next_board_position double precision,
  status_reason text default null
) returns public.tasks
    language plpgsql
    set search_path to ''
    as $$
declare
  saved public.tasks;
  next_status public.statuses;
  previous_status_id uuid;
  trimmed_reason text := nullif(btrim(coalesce(status_reason, '')), '');
  reason_required boolean;
begin
  if auth.uid() is null then raise exception 'Not authorized'; end if;
  if not (next_board_position between -1000000000000000 and 1000000000000000) then
    raise exception 'Invalid board position';
  end if;

  select * into next_status from public.statuses where id = next_status_id;
  if next_status.id is null then raise exception 'Status not found'; end if;

  select tasks.status_id into previous_status_id
  from public.tasks where tasks.id = moved_task_id;
  -- Reordering a card inside the column it already sits in is not a move.
  reason_required := next_status.requires_reason
    and previous_status_id is distinct from next_status_id;
  if reason_required and trimmed_reason is null then
    raise exception 'Add a reason before moving this task to %.', next_status.name
      using errcode = 'TK001';
  end if;

  update public.tasks
  set status_id = next_status_id, board_position = next_board_position
  where id = moved_task_id
  returning * into saved;
  if saved.id is null then raise exception 'Task not found'; end if;

  if reason_required then
    insert into public.task_comments (task_id, body, created_by)
    values (saved.id, trimmed_reason, auth.uid());
  end if;

  return saved;
end;
$$;

alter function public.move_task(uuid, uuid, double precision, text) owner to postgres;
grant all on function public.move_task(uuid, uuid, double precision, text) to anon;
grant all on function public.move_task(uuid, uuid, double precision, text) to authenticated;
grant all on function public.move_task(uuid, uuid, double precision, text) to service_role;

drop function if exists public.move_task(uuid, uuid, double precision);

-- The bootstrap workflow ships the same contract as `supabase/seed.sql` and
-- `lib/workspace/default-statuses.ts`: only "Will Not Do" asks for a reason.
create or replace function public.provision_workspace_member(
  requested_profile_id uuid,
  requested_full_name text default null::text,
  requested_email text default null::text
)
returns public.profiles
language plpgsql
security definer
set search_path to ''
as $function$
declare
  default_tier_id uuid;
  saved_profile public.profiles;
begin
  if requested_profile_id is null then
    raise exception 'A profile id is required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('public.workspace_member.provision', 0)
  );

  insert into public.profiles (id, full_name)
  values (
    requested_profile_id,
    coalesce(
      nullif(trim(requested_full_name), ''),
      nullif(split_part(coalesce(requested_email, ''), '@', 1), ''),
      'New teammate'
    )
  )
  on conflict (id) do nothing;

  insert into public.statuses (
    name,
    description,
    color,
    sort_order,
    is_default,
    is_completed,
    requires_reason
  )
  select * from (values
    ('Backlog', 'Ideas and requests that are not ready to schedule yet.', '#64748b', 0, true, false, false),
    ('Todo', 'Ready to be picked up and worked on.', '#2563eb', 1, true, false, false),
    ('In Progress', 'Actively being worked on right now.', '#d97706', 2, true, false, false),
    ('In Review', 'Waiting for feedback, approval, or final checks.', '#7c3aed', 3, true, false, false),
    ('Done', 'Finished work that no longer needs action.', '#059669', 4, true, true, false),
    ('Will Not Do', 'Work that has been intentionally declined and will not be pursued.', '#f51b2b', 5, true, false, true)
  ) as defaults (name, description, color, sort_order, is_default, is_completed, requires_reason)
  where not exists (select 1 from public.statuses);

  select id into default_tier_id
  from public.access_groups
  where is_default and kind = 'tier'
  limit 1;

  if default_tier_id is null then
    select id into default_tier_id
    from public.access_groups
    where kind = 'tier'
    order by hierarchy_rank, created_at, id
    limit 1;

    if default_tier_id is null then
      insert into public.access_groups (
        name,
        description,
        created_by,
        kind,
        hierarchy_rank,
        is_default
      ) values (
        'Members',
        'The baseline tier inherited by everyone in the workspace.',
        requested_profile_id,
        'tier',
        0,
        true
      )
      returning id into default_tier_id;
    else
      update public.access_groups
      set is_default = true
      where id = default_tier_id;
    end if;
  end if;

  if not exists (
    select 1
    from public.access_group_members membership
    join public.access_groups access_group
      on access_group.id = membership.group_id
    where membership.profile_id = requested_profile_id
      and access_group.kind = 'tier'
  ) then
    insert into public.access_group_members (group_id, profile_id, added_by)
    values (default_tier_id, requested_profile_id, requested_profile_id)
    on conflict do nothing;
  end if;

  select * into saved_profile
  from public.profiles
  where id = requested_profile_id;

  return saved_profile;
end;
$function$;
