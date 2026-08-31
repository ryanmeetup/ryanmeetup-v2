-- Close the gaps between what the workspace records and what Activity shows.
--
-- Three kinds of change live here, matching `docs/ACTIVITY_COVERAGE_AUDIT.md`:
--
--   * a task save that changes its status no longer swallows the rest of the
--     save, and a save that only moves a card on the board records nothing;
--   * the surfaces that were writing a single opaque row -- contact people,
--     owners, note comment edits -- now say what actually changed;
--   * privileged actions that reshape the whole workspace (statuses, access,
--     team, settings) get a way to reach the feed at all.

-- ---------------------------------------------------------------------------
-- Task saves
-- ---------------------------------------------------------------------------

-- A status change and a field edit are two separate facts about one save, so
-- they are two rows. `board_position` and the completion timestamps derived
-- from the status are excluded from "did anything change": a drag inside a
-- column, and the lifecycle trigger's own writes, are not edits.
--
-- The id of the row a save wrote is published on a transaction-local setting
-- so `save_task` can hand it back. Matching by recency instead, as the API
-- used to, mis-attributes the diff when two saves land in the same minute.
create or replace function public.log_task_change() returns trigger
    language plpgsql security definer
    set search_path to ''
    as $function$
declare
  ignored constant text[] := array[
    'id', 'created_at', 'updated_at', 'created_by', 'task_number',
    'board_position', 'status_id', 'completed_at', 'archived_at'
  ];
  recorded_id uuid;
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity (task_id, actor_id, action, details)
    values (new.id, auth.uid(), 'created the task', '{}'::jsonb);
    return new;
  end if;

  if old.status_id is distinct from new.status_id then
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
  end if;

  if (to_jsonb(old) - ignored) is distinct from (to_jsonb(new) - ignored) then
    insert into public.task_activity (task_id, actor_id, action, details)
    values (new.id, auth.uid(), 'updated the task', '{}'::jsonb)
    returning id into recorded_id;
    perform set_config(
      'app.last_task_update_activity_id', recorded_id::text, true
    );
  end if;

  return new;
end;
$function$;

-- `save_task` gains `activity_id` in its result: the row the caller should
-- describe with a field-level diff, or null when the save changed no fields.
-- Everything else is unchanged from 20260916000000.
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

  recorded_activity_id := nullif(
    coalesce(current_setting('app.last_task_update_activity_id', true), ''), ''
  );

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

-- ---------------------------------------------------------------------------
-- Privileged actions that belong in the feed
-- ---------------------------------------------------------------------------

-- `record_privileged_audit_event` writes the compliance trail, which is a
-- different table and a different audience from the workspace feed. This is
-- the feed's counterpart: an explicit, service-role-only way to say "a
-- teammate should be able to see that this happened".
create or replace function public.record_workspace_activity_event(
  requested_actor_id uuid,
  requested_action text,
  requested_target_type text,
  requested_target_id uuid default null,
  requested_metadata jsonb default '{}'::jsonb
) returns void
    language plpgsql security definer
    set search_path to ''
    as $function$
begin
  insert into public.permission_audit_events (
    actor_id, action, target_type, target_id, before_state, after_state
  ) values (
    requested_actor_id,
    requested_action,
    requested_target_type,
    requested_target_id,
    null,
    jsonb_strip_nulls(
      coalesce(requested_metadata, '{}'::jsonb)
        || jsonb_build_object('activity', true)
    )
  );
end;
$function$;

alter function public.record_workspace_activity_event(uuid, text, text, uuid, jsonb)
  owner to postgres;
revoke all on function public.record_workspace_activity_event(uuid, text, text, uuid, jsonb)
  from public;
grant execute on function public.record_workspace_activity_event(uuid, text, text, uuid, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- Resource activity metadata
-- ---------------------------------------------------------------------------

-- Calendar events are readable per project *and* per category, so the feed
-- needs both ids to decide who may see one. Recording them on every resource
-- keeps the shape uniform.
create or replace function public.log_workspace_resource_activity()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  resource_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  resource_action text;
  resource_project_id uuid;
  resource_category_id uuid;
begin
  if coalesce(current_setting('app.suppress_workspace_activity', true), 'false') = 'true' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  resource_action := case
    when tg_op = 'INSERT' then tg_argv[1] || '.create'
    when tg_op = 'DELETE' then tg_argv[1] || '.delete'
    when (to_jsonb(old) ->> 'archived_at') is null
      and (to_jsonb(new) ->> 'archived_at') is not null then tg_argv[1] || '.archive'
    when (to_jsonb(old) ->> 'archived_at') is not null
      and (to_jsonb(new) ->> 'archived_at') is null then tg_argv[1] || '.restore'
    else tg_argv[1] || '.update'
  end;

  resource_project_id := case
    when tg_argv[0] = 'project' then (resource_row ->> 'id')::uuid
    when resource_row ? 'project_id' then nullif(resource_row ->> 'project_id', '')::uuid
    else null
  end;

  resource_category_id := case
    when tg_argv[0] = 'category' then (resource_row ->> 'id')::uuid
    when resource_row ? 'category_id' then nullif(resource_row ->> 'category_id', '')::uuid
    else null
  end;

  insert into public.permission_audit_events (
    actor_id,
    action,
    target_type,
    target_id,
    before_state,
    after_state
  ) values (
    auth.uid(),
    resource_action,
    tg_argv[0],
    (resource_row ->> 'id')::uuid,
    null,
    jsonb_strip_nulls(jsonb_build_object(
      'activity', true,
      'resource_name', resource_row ->> tg_argv[2],
      'resource_href', nullif(tg_argv[3], ''),
      'project_id', resource_project_id,
      'category_id', resource_category_id
    ))
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

revoke all on function public.log_workspace_resource_activity() from public;

-- ---------------------------------------------------------------------------
-- Note comments
-- ---------------------------------------------------------------------------

-- Task comments record added / edited / deleted. Note comments recorded only
-- added, so a comment could be rewritten or removed with no trace.
create or replace function public.log_note_comment_workspace_activity()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  comment_row public.note_comments := case when tg_op = 'DELETE' then old else new end;
  comment_action text := case
    when tg_op = 'INSERT' then 'note.comment'
    when tg_op = 'DELETE' then 'note.comment.delete'
    else 'note.comment.update'
  end;
begin
  -- `edited_at` alone is bookkeeping, not an edit anyone needs to read about.
  if tg_op = 'UPDATE' and old.body is not distinct from new.body then
    return new;
  end if;

  insert into public.permission_audit_events (
    actor_id, action, target_type, target_id, before_state, after_state
  )
  select
    auth.uid(),
    comment_action,
    'note',
    note.id,
    null,
    jsonb_build_object(
      'activity', true,
      'resource_name', coalesce(nullif(note.title, ''), left(note.body, 80)),
      'resource_href', '/notes'
    )
  from public.notes note
  where note.id = comment_row.note_id;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

revoke all on function public.log_note_comment_workspace_activity() from public;
drop trigger if exists log_note_comment_workspace_activity on public.note_comments;
create trigger log_note_comment_workspace_activity
after insert or update or delete on public.note_comments
for each row execute function public.log_note_comment_workspace_activity();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Every Activity page load orders this table by `created_at` under a jsonb
-- containment predicate; without these it is a full scan and a sort.
create index if not exists permission_audit_events_created_at_idx
  on public.permission_audit_events using btree (created_at desc);
create index if not exists permission_audit_events_activity_idx
  on public.permission_audit_events using btree (created_at desc)
  where after_state @> '{"activity": true}'::jsonb;

-- ---------------------------------------------------------------------------
-- Owner changes
-- ---------------------------------------------------------------------------

-- Owners are replaced wholesale inside the update transaction, so the only
-- trace was an undifferentiated `project.update`. This names the people.
create or replace function public.owner_change_detail(
  previous_ids uuid[],
  next_ids uuid[]
) returns text
    language sql stable security definer
    set search_path to ''
    as $function$
  select nullif(
    concat_ws(
      '; ',
      (
        select 'Added ' || string_agg(profile.full_name, ', ' order by profile.full_name)
        from public.profiles profile
        where profile.id = any(next_ids)
          and not (profile.id = any(previous_ids))
      ),
      (
        select 'Removed ' || string_agg(profile.full_name, ', ' order by profile.full_name)
        from public.profiles profile
        where profile.id = any(previous_ids)
          and not (profile.id = any(next_ids))
      )
    ),
    ''
  );
$function$;

alter function public.owner_change_detail(uuid[], uuid[]) owner to postgres;
revoke all on function public.owner_change_detail(uuid[], uuid[]) from public;
grant execute on function public.owner_change_detail(uuid[], uuid[])
  to authenticated, service_role;

create or replace function public.update_category_with_owners(
  requested_category_id uuid,
  requested_values jsonb
)
returns setof public.work_groups
language plpgsql
security definer
set search_path to ''
as $function$
declare
  category_row public.work_groups;
  normalized_owner_ids uuid[];
  previous_owner_ids uuid[];
  owner_detail text;
begin
  if not public.can_manage_categories() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if requested_values ? 'ownerIds' then
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into normalized_owner_ids
    from jsonb_array_elements_text(requested_values -> 'ownerIds');
    if cardinality(normalized_owner_ids) = 0 then
      raise exception 'A category requires at least one owner' using errcode = '23514';
    end if;
    if exists (
      select 1 from unnest(normalized_owner_ids) owner_id
      where not exists (
        select 1 from public.profiles profile
        where profile.id = owner_id and profile.onboarding_completed
      )
    ) then
      raise exception 'A selected category owner is not eligible' using errcode = '23514';
    end if;
  end if;

  update public.work_groups
  set
    name = case when requested_values ? 'name' then requested_values ->> 'name' else name end,
    description = case when requested_values ? 'description' then requested_values ->> 'description' else description end,
    color = case when requested_values ? 'color' then requested_values ->> 'color' else color end,
    links = case when requested_values ? 'links' then requested_values -> 'links' else links end,
    tags = case when requested_values ? 'tags' then
      array(select jsonb_array_elements_text(requested_values -> 'tags')) else tags end,
    archived_at = case when requested_values ? 'archived' then
      case when (requested_values ->> 'archived')::boolean then now() else null end
      else archived_at end
  where id = requested_category_id
  returning * into category_row;

  if category_row.id is null then
    raise exception 'Category not found' using errcode = 'P0002';
  end if;

  if normalized_owner_ids is not null then
    select coalesce(array_agg(profile_id), '{}'::uuid[])
    into previous_owner_ids
    from public.category_owners
    where category_id = requested_category_id;

    delete from public.category_owners where category_id = requested_category_id;
    insert into public.category_owners (category_id, profile_id)
    select requested_category_id, owner_id
    from (select distinct unnest(normalized_owner_ids) owner_id) owners;

    owner_detail := public.owner_change_detail(
      previous_owner_ids, normalized_owner_ids
    );
    if owner_detail is not null then
      insert into public.permission_audit_events (
        actor_id, action, target_type, target_id, before_state, after_state
      ) values (
        auth.uid(),
        'category.owners.update',
        'category',
        requested_category_id,
        null,
        jsonb_build_object(
          'activity', true,
          'resource_name', category_row.name,
          'resource_href', '/categories',
          'detail', owner_detail
        )
      );
    end if;
  end if;

  return next category_row;
end;
$function$;

create or replace function public.replace_project_owners_and_update(
  requested_project_id uuid,
  requested_values jsonb
)
returns setof public.projects
language plpgsql
security definer
set search_path to ''
as $function$
declare
  project_row public.projects;
  normalized_owner_ids uuid[];
  previous_owner_ids uuid[];
  owner_detail text;
begin
  if not public.can_manage_project(requested_project_id) then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  if requested_values ? 'ownerIds' then
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
    into normalized_owner_ids
    from jsonb_array_elements_text(requested_values -> 'ownerIds');
    if cardinality(normalized_owner_ids) = 0 then
      raise exception 'A project requires at least one owner' using errcode = '23514';
    end if;
    if exists (
      select 1 from unnest(normalized_owner_ids) owner_id
      where not exists (
        select 1 from public.profiles profile
        where profile.id = owner_id and profile.onboarding_completed
      )
    ) then
      raise exception 'A selected project owner is not eligible' using errcode = '23514';
    end if;
  end if;

  update public.projects
  set
    name = case when requested_values ? 'name' then requested_values ->> 'name' else name end,
    description = case when requested_values ? 'description' then requested_values ->> 'description' else description end,
    links = case when requested_values ? 'links' then requested_values -> 'links' else links end,
    status = case when requested_values ? 'status' then requested_values ->> 'status' else status end,
    archived_at = case when requested_values ? 'archived' then
      case when (requested_values ->> 'archived')::boolean then now() else null end
      else archived_at end
  where id = requested_project_id
  returning * into project_row;

  if project_row.id is null then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  if normalized_owner_ids is not null then
    select coalesce(array_agg(profile_id), '{}'::uuid[])
    into previous_owner_ids
    from public.project_owners
    where project_id = requested_project_id;

    delete from public.project_owners where project_id = requested_project_id;
    insert into public.project_owners (project_id, profile_id)
    select requested_project_id, owner_id
    from (select distinct unnest(normalized_owner_ids) owner_id) owners;

    owner_detail := public.owner_change_detail(
      previous_owner_ids, normalized_owner_ids
    );
    if owner_detail is not null then
      insert into public.permission_audit_events (
        actor_id, action, target_type, target_id, before_state, after_state
      ) values (
        auth.uid(),
        'project.owners.update',
        'project',
        requested_project_id,
        null,
        jsonb_build_object(
          'activity', true,
          'resource_name', project_row.name,
          'resource_href', '/projects',
          'project_id', requested_project_id,
          'detail', owner_detail
        )
      );
    end if;
  end if;

  return next project_row;
end;
$function$;

revoke all on function public.update_category_with_owners(uuid,jsonb) from public;
revoke all on function public.replace_project_owners_and_update(uuid,jsonb) from public;
grant execute on function public.update_category_with_owners(uuid,jsonb) to authenticated, service_role;
grant execute on function public.replace_project_owners_and_update(uuid,jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------------

-- Contact people, their category assignments, and the contact categories a
-- save creates all used to collapse into one `organization.update` (or, for a
-- new category, an event pointed at the wrong table entirely). The people and
-- assignments are replaced wholesale inside this transaction, so the diff has
-- to be taken here -- a row trigger would only ever see delete-all/insert-all.
create or replace function public.save_contact_with_activity(
  contact_id uuid,
  contact_is_new boolean,
  contact_name text,
  contact_notes text,
  contact_image_url text,
  contact_image_path text,
  retain_contact_image boolean,
  contact_group_name text,
  category_ids uuid[],
  new_category_names text[],
  people jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  saved_id uuid;
  category_row record;
  existing_category_ids uuid[];
  category_name text;
  new_category_id uuid;
  person jsonb;
  saved_name text := btrim(contact_name);
  previous_people jsonb;
  next_people jsonb;
  previous_category_ids uuid[];
  next_category_ids uuid[];
  person_key text;
  person_value jsonb;
  category_detail text;
begin
  if not public.is_team_member() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if contact_id is null then raise exception 'Invalid contact id'; end if;
  if contact_name is null or char_length(btrim(contact_name)) not between 1 and 160 then
    raise exception 'Invalid contact name';
  end if;
  if jsonb_typeof(people) <> 'array' or jsonb_array_length(people) > 100 then
    raise exception 'Invalid people';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[])
  into existing_category_ids
  from public.contact_categories
  where name = any(coalesce(new_category_names, '{}'::text[]));

  if contact_is_new then
    insert into public.contacts (
      id, display_name, notes, image_url, image_path, contact_group, created_by
    ) values (
      contact_id,
      saved_name,
      nullif(btrim(contact_notes), ''),
      contact_image_url,
      contact_image_path,
      contact_group_name,
      auth.uid()
    ) returning id into saved_id;
  else
    update public.contacts
    set
      display_name = saved_name,
      notes = nullif(btrim(contact_notes), ''),
      image_url = case when retain_contact_image then image_url else contact_image_url end,
      image_path = case when retain_contact_image then image_path else contact_image_path end,
      contact_group = contact_group_name
    where id = contact_id
    returning id into saved_id;
    if saved_id is null then raise exception 'Contact not found' using errcode = 'P0002'; end if;
  end if;

  select coalesce(array_agg(assignment.category_id), '{}'::uuid[])
  into previous_category_ids
  from public.contact_category_assignments assignment
  where assignment.contact_id = saved_id;

  select coalesce(jsonb_object_agg(
    contact_person.id::text,
    jsonb_build_object(
      'full_name', contact_person.full_name,
      'title', contact_person.title,
      'emails', to_jsonb(contact_person.emails),
      'phone', contact_person.phone,
      'instagram_handle', contact_person.instagram_handle
    )
  ), '{}'::jsonb)
  into previous_people
  from public.contact_people contact_person
  where contact_person.contact_id = saved_id;

  delete from public.contact_category_assignments
  where public.contact_category_assignments.contact_id = saved_id;
  insert into public.contact_category_assignments (contact_id, category_id)
  select saved_id, id
  from public.contact_categories
  where id = any(coalesce(category_ids, '{}'::uuid[]));

  foreach category_name in array coalesce(new_category_names, '{}'::text[]) loop
    category_name := btrim(category_name);
    if char_length(category_name) not between 1 and 80 then raise exception 'Invalid category'; end if;
    insert into public.contact_categories (name, created_by)
    values (category_name, auth.uid())
    on conflict (name) do update set name = excluded.name
    returning id into new_category_id;
    insert into public.contact_category_assignments (contact_id, category_id)
    values (saved_id, new_category_id) on conflict do nothing;
  end loop;

  delete from public.contact_people where public.contact_people.contact_id = saved_id;
  for person in select value from jsonb_array_elements(people) loop
    if char_length(btrim(person->>'full_name')) not between 1 and 160 then raise exception 'Invalid person name'; end if;
    if char_length(btrim(person->>'title')) > 160 then raise exception 'Invalid person title'; end if;
    insert into public.contact_people (
      id, contact_id, full_name, title, emails, phone, instagram_handle
    ) values (
      coalesce(nullif(person->>'id', '')::uuid, gen_random_uuid()),
      saved_id,
      btrim(person->>'full_name'),
      nullif(btrim(person->>'title'), ''),
      coalesce(array(select lower(btrim(value)) from jsonb_array_elements_text(coalesce(person->'emails', '[]'::jsonb))), '{}'),
      nullif(btrim(person->>'phone'), ''),
      nullif(ltrim(btrim(person->>'instagram_handle'), '@'), '')
    );
  end loop;

  for category_row in
    select id, name from public.contact_categories
    where name = any(coalesce(new_category_names, '{}'::text[]))
      and not (id = any(existing_category_ids))
  loop
    -- A contact category is not a work group: pointing this at `category`
    -- meant the feed matched it against `work_groups` and dropped it.
    insert into public.permission_audit_events (
      actor_id, action, target_type, target_id, before_state, after_state
    ) values (
      auth.uid(),
      'contact_category.create',
      'contact_category',
      category_row.id,
      null,
      jsonb_build_object(
        'activity', true,
        'resource_name', category_row.name,
        'resource_href', '/contacts'
      )
    );
  end loop;

  select coalesce(jsonb_object_agg(
    contact_person.id::text,
    jsonb_build_object(
      'full_name', contact_person.full_name,
      'title', contact_person.title,
      'emails', to_jsonb(contact_person.emails),
      'phone', contact_person.phone,
      'instagram_handle', contact_person.instagram_handle
    )
  ), '{}'::jsonb)
  into next_people
  from public.contact_people contact_person
  where contact_person.contact_id = saved_id;

  for person_key, person_value in select key, value from jsonb_each(next_people) loop
    if not previous_people ? person_key then
      insert into public.permission_audit_events (
        actor_id, action, target_type, target_id, before_state, after_state
      ) values (
        auth.uid(), 'organization.person.add', 'organization', saved_id, null,
        jsonb_build_object(
          'activity', true,
          'resource_name', saved_name,
          'resource_href', '/contacts',
          'detail', person_value ->> 'full_name'
        )
      );
    elsif previous_people -> person_key is distinct from person_value then
      insert into public.permission_audit_events (
        actor_id, action, target_type, target_id, before_state, after_state
      ) values (
        auth.uid(), 'organization.person.update', 'organization', saved_id, null,
        jsonb_build_object(
          'activity', true,
          'resource_name', saved_name,
          'resource_href', '/contacts',
          'detail', person_value ->> 'full_name'
        )
      );
    end if;
  end loop;

  for person_key, person_value in select key, value from jsonb_each(previous_people) loop
    if not next_people ? person_key then
      insert into public.permission_audit_events (
        actor_id, action, target_type, target_id, before_state, after_state
      ) values (
        auth.uid(), 'organization.person.remove', 'organization', saved_id, null,
        jsonb_build_object(
          'activity', true,
          'resource_name', saved_name,
          'resource_href', '/contacts',
          'detail', person_value ->> 'full_name'
        )
      );
    end if;
  end loop;

  select coalesce(array_agg(assignment.category_id), '{}'::uuid[])
  into next_category_ids
  from public.contact_category_assignments assignment
  where assignment.contact_id = saved_id;

  select nullif(
    concat_ws(
      '; ',
      (
        select 'Added ' || string_agg(category.name, ', ' order by category.name)
        from public.contact_categories category
        where category.id = any(next_category_ids)
          and not (category.id = any(previous_category_ids))
      ),
      (
        select 'Removed ' || string_agg(category.name, ', ' order by category.name)
        from public.contact_categories category
        where category.id = any(previous_category_ids)
          and not (category.id = any(next_category_ids))
      )
    ),
    ''
  ) into category_detail;

  if category_detail is not null then
    insert into public.permission_audit_events (
      actor_id, action, target_type, target_id, before_state, after_state
    ) values (
      auth.uid(), 'organization.categories.update', 'organization', saved_id, null,
      jsonb_build_object(
        'activity', true,
        'resource_name', saved_name,
        'resource_href', '/contacts',
        'detail', category_detail
      )
    );
  end if;

  return (
    select jsonb_build_object(
      'id', contact.id,
      'display_name', contact.display_name,
      'image_url', contact.image_url,
      'image_path', contact.image_path,
      'contact_group', contact.contact_group,
      'notes', contact.notes,
      'created_at', contact.created_at,
      'updated_at', contact.updated_at,
      'people', coalesce((
        select jsonb_agg(to_jsonb(contact_person) - 'contact_id' - 'created_at' order by contact_person.full_name)
        from public.contact_people contact_person
        where contact_person.contact_id = saved_id
      ), '[]'::jsonb),
      'categories', coalesce((
        select jsonb_agg(
          jsonb_build_object('id', category.id, 'name', category.name, 'color', category.color)
          order by category.name
        )
        from public.contact_category_assignments assignment
        join public.contact_categories category on category.id = assignment.category_id
        where assignment.contact_id = saved_id
      ), '[]'::jsonb)
    )
    from public.contacts contact
    where contact.id = saved_id
  );
end;
$function$;

revoke all on function public.save_contact_with_activity(uuid,boolean,text,text,text,text,boolean,text,uuid[],text[],jsonb) from public;
grant execute on function public.save_contact_with_activity(uuid,boolean,text,text,text,text,boolean,text,uuid[],text[],jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Deployment contract
-- ---------------------------------------------------------------------------

-- The app now calls `record_workspace_activity_event` and reads `activity_id`
-- out of `save_task`. `scripts/check-database-contract.mjs` refuses a deploy
-- whose database is missing them, which matters because the two Tasks
-- instances are migrated independently.
CREATE OR REPLACE FUNCTION public.beginner_flow_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  contract_ok boolean;
  default_tier_count integer;
  profile_count integer;
  profiles_without_tier integer;
  auth_users_without_profile integer;
  status_count integer;
  profile_trigger_active boolean;
begin
  if auth.uid() is not null and not public.is_app_owner() then
    raise exception 'Only app owners may inspect workspace health'
      using errcode = '42501';
  end if;

  select count(*) into default_tier_count
  from public.access_groups
  where is_default and kind = 'tier';

  select count(*) into profile_count from public.profiles;

  select count(*) into profiles_without_tier
  from public.profiles profile
  where not exists (
    select 1
    from public.access_group_members membership
    join public.access_groups access_group
      on access_group.id = membership.group_id
    where membership.profile_id = profile.id
      and access_group.kind = 'tier'
  );

  select count(*) into auth_users_without_profile
  from auth.users auth_user
  where not exists (
    select 1 from public.profiles profile where profile.id = auth_user.id
  );

  select count(*) into status_count from public.statuses;

  select exists (
    select 1
    from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'auth_user_profile'
      and tgenabled <> 'D'
  ) into profile_trigger_active;

  select
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'projects'
        and column_name = 'access_mode'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'access_groups'
        and column_name = 'is_default'
    )
    and to_regprocedure(
      'public.provision_workspace_member(uuid,text,text)'
    ) is not null
    and to_regprocedure(
      'public.create_project_with_visibility(text,text,jsonb,uuid[],text,uuid[])'
    ) is not null
    and to_regprocedure(
      'public.set_project_visibility(uuid,text,uuid[])'
    ) is not null
    and to_regprocedure(
      'public.record_workspace_activity_event(uuid,text,text,uuid,jsonb)'
    ) is not null
    and to_regprocedure(
      'public.owner_change_detail(uuid[],uuid[])'
    ) is not null
  into contract_ok;

  return jsonb_build_object(
    'healthy',
      contract_ok
      and profile_trigger_active
      and default_tier_count = 1
      and profiles_without_tier = 0
      and auth_users_without_profile = 0
      and status_count > 0,
    'contractOk', contract_ok,
    'profileTriggerActive', profile_trigger_active,
    'defaultTierCount', default_tier_count,
    'profileCount', profile_count,
    'profilesWithoutTier', profiles_without_tier,
    'authUsersWithoutProfile', auth_users_without_profile,
    'statusCount', status_count
  );
end;
$function$
;
