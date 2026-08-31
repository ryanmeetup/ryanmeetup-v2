-- Keep canonical resource changes and their workspace activity in one transaction.

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
      'project_id', resource_project_id
    ))
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

revoke all on function public.log_workspace_resource_activity() from public;

drop trigger if exists log_work_group_workspace_activity on public.work_groups;
create trigger log_work_group_workspace_activity
after insert or update or delete on public.work_groups
for each row execute function public.log_workspace_resource_activity(
  'category', 'category', 'name', '/categories'
);

drop trigger if exists log_project_workspace_activity on public.projects;
create trigger log_project_workspace_activity
after insert or update or delete on public.projects
for each row execute function public.log_workspace_resource_activity(
  'project', 'project', 'name', '/projects'
);

drop trigger if exists log_contact_workspace_activity on public.contacts;
create trigger log_contact_workspace_activity
after insert or update or delete on public.contacts
for each row execute function public.log_workspace_resource_activity(
  'organization', 'organization', 'display_name', '/contacts'
);

drop trigger if exists log_calendar_event_workspace_activity on public.calendar_events;
create trigger log_calendar_event_workspace_activity
after insert or update or delete on public.calendar_events
for each row execute function public.log_workspace_resource_activity(
  'calendar_event', 'calendar', 'title', '/calendar'
);

create or replace function public.log_note_workspace_activity()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  note_row public.notes := case when tg_op = 'DELETE' then old else new end;
  note_action text;
begin
  note_action := case
    when tg_op = 'INSERT' then 'note.create'
    when tg_op = 'DELETE' then 'note.delete'
    when old.converted_task_id is distinct from new.converted_task_id
      or old.converted_project_id is distinct from new.converted_project_id then 'note.convert'
    when old.archived_at is null and new.archived_at is not null then 'note.archive'
    when old.archived_at is not null and new.archived_at is null then 'note.restore'
    else 'note.update'
  end;

  if note_action = 'note.update' and exists (
    select 1 from public.permission_audit_events event
    where event.actor_id = auth.uid()
      and event.action = note_action
      and event.target_type = 'note'
      and event.target_id = note_row.id
      and event.created_at >= now() - interval '5 minutes'
  ) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  insert into public.permission_audit_events (
    actor_id, action, target_type, target_id, before_state, after_state
  ) values (
    auth.uid(),
    note_action,
    'note',
    note_row.id,
    null,
    jsonb_build_object(
      'activity', true,
      'resource_name', coalesce(nullif(note_row.title, ''), left(note_row.body, 80)),
      'resource_href', '/notes'
    )
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

revoke all on function public.log_note_workspace_activity() from public;
drop trigger if exists log_note_workspace_activity on public.notes;
create trigger log_note_workspace_activity
after insert or update or delete on public.notes
for each row execute function public.log_note_workspace_activity();

create or replace function public.log_note_comment_workspace_activity()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  insert into public.permission_audit_events (
    actor_id, action, target_type, target_id, before_state, after_state
  )
  select
    auth.uid(),
    'note.comment',
    'note',
    note.id,
    null,
    jsonb_build_object(
      'activity', true,
      'resource_name', coalesce(nullif(note.title, ''), left(note.body, 80)),
      'resource_href', '/notes'
    )
  from public.notes note
  where note.id = new.note_id;
  return new;
end;
$function$;

revoke all on function public.log_note_comment_workspace_activity() from public;
drop trigger if exists log_note_comment_workspace_activity on public.note_comments;
create trigger log_note_comment_workspace_activity
after insert on public.note_comments
for each row execute function public.log_note_comment_workspace_activity();

create or replace function public.log_resource_attachment_workspace_activity()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  attachment_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  parent_name text;
  activity_action text;
begin
  if tg_op = 'UPDATE'
    and old.name is not distinct from new.name
    and old.body is not distinct from new.body then
    return new;
  end if;

  if tg_argv[0] = 'project' then
    select name into parent_name from public.projects
    where id = (attachment_row ->> 'project_id')::uuid;
  else
    select name into parent_name from public.work_groups
    where id = (attachment_row ->> 'category_id')::uuid;
  end if;

  activity_action := tg_argv[0] || '.attachment.' || case
    when tg_op = 'INSERT' then 'add'
    when tg_op = 'DELETE' then 'delete'
    else 'update'
  end;
  insert into public.permission_audit_events (
    actor_id, action, target_type, target_id, before_state, after_state
  ) values (
    auth.uid(),
    activity_action,
    tg_argv[0],
    (attachment_row ->> case when tg_argv[0] = 'project' then 'project_id' else 'category_id' end)::uuid,
    null,
    jsonb_strip_nulls(jsonb_build_object(
      'activity', true,
      'resource_name', parent_name,
      'resource_href', case when tg_argv[0] = 'project' then '/projects' else '/categories' end,
      'project_id', case when tg_argv[0] = 'project' then attachment_row ->> 'project_id' else null end,
      'attachment_name', attachment_row ->> 'name'
    ))
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

revoke all on function public.log_resource_attachment_workspace_activity() from public;
drop trigger if exists log_project_attachment_workspace_activity on public.project_attachments;
create trigger log_project_attachment_workspace_activity
after insert or update or delete on public.project_attachments
for each row execute function public.log_resource_attachment_workspace_activity('project');
drop trigger if exists log_category_attachment_workspace_activity on public.category_attachments;
create trigger log_category_attachment_workspace_activity
after insert or update or delete on public.category_attachments
for each row execute function public.log_resource_attachment_workspace_activity('category');

create or replace function public.create_category_with_owners(
  requested_name text,
  requested_description text,
  requested_color text,
  requested_links jsonb,
  requested_tags text[],
  requested_owner_ids uuid[],
  requested_access_mode text,
  requested_group_ids uuid[]
)
returns setof public.work_groups
language plpgsql
security definer
set search_path to ''
as $function$
declare
  category_row public.work_groups;
  normalized_owner_ids uuid[] := coalesce(requested_owner_ids, '{}'::uuid[]);
begin
  if not public.can_manage_categories() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
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
  if requested_access_mode is not null and not public.is_app_owner() then
    raise exception 'Only app owners may configure category access' using errcode = '42501';
  end if;

  insert into public.work_groups (
    name, description, color, links, tags, created_by
  ) values (
    requested_name,
    requested_description,
    requested_color,
    coalesce(requested_links, '[]'::jsonb),
    coalesce(requested_tags, '{}'::text[]),
    auth.uid()
  ) returning * into category_row;

  insert into public.category_owners (category_id, profile_id)
  select category_row.id, owner_id
  from (select distinct unnest(normalized_owner_ids) owner_id) owners;

  if requested_access_mode is not null then
    perform set_config('app.suppress_workspace_activity', 'true', true);
    perform public.set_category_access(
      category_row.id,
      requested_access_mode,
      coalesce(requested_group_ids, '{}'::uuid[])
    );
    perform set_config('app.suppress_workspace_activity', 'false', true);
    select * into category_row from public.work_groups where id = category_row.id;
  end if;

  return next category_row;
end;
$function$;

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
    delete from public.category_owners where category_id = requested_category_id;
    insert into public.category_owners (category_id, profile_id)
    select requested_category_id, owner_id
    from (select distinct unnest(normalized_owner_ids) owner_id) owners;
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
    delete from public.project_owners where project_id = requested_project_id;
    insert into public.project_owners (project_id, profile_id)
    select requested_project_id, owner_id
    from (select distinct unnest(normalized_owner_ids) owner_id) owners;
  end if;

  return next project_row;
end;
$function$;

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
      btrim(contact_name),
      nullif(btrim(contact_notes), ''),
      contact_image_url,
      contact_image_path,
      contact_group_name,
      auth.uid()
    ) returning id into saved_id;
  else
    update public.contacts
    set
      display_name = btrim(contact_name),
      notes = nullif(btrim(contact_notes), ''),
      image_url = case when retain_contact_image then image_url else contact_image_url end,
      image_path = case when retain_contact_image then image_path else contact_image_path end,
      contact_group = contact_group_name
    where id = contact_id
    returning id into saved_id;
    if saved_id is null then raise exception 'Contact not found' using errcode = 'P0002'; end if;
  end if;

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
    insert into public.permission_audit_events (
      actor_id, action, target_type, target_id, before_state, after_state
    ) values (
      auth.uid(),
      'category.create',
      'category',
      category_row.id,
      null,
      jsonb_build_object(
        'activity', true,
        'resource_name', category_row.name,
        'resource_href', '/categories'
      )
    );
  end loop;

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

revoke all on function public.create_category_with_owners(text,text,text,jsonb,text[],uuid[],text,uuid[]) from public;
revoke all on function public.update_category_with_owners(uuid,jsonb) from public;
revoke all on function public.replace_project_owners_and_update(uuid,jsonb) from public;
revoke all on function public.save_contact_with_activity(uuid,boolean,text,text,text,text,boolean,text,uuid[],text[],jsonb) from public;

grant execute on function public.create_category_with_owners(text,text,text,jsonb,text[],uuid[],text,uuid[]) to authenticated, service_role;
grant execute on function public.update_category_with_owners(uuid,jsonb) to authenticated, service_role;
grant execute on function public.replace_project_owners_and_update(uuid,jsonb) to authenticated, service_role;
grant execute on function public.save_contact_with_activity(uuid,boolean,text,text,text,text,boolean,text,uuid[],text[],jsonb) to authenticated, service_role;
