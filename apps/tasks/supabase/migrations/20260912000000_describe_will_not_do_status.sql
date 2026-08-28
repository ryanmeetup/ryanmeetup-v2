update public.statuses
set description = 'Work that has been intentionally declined and will not be pursued.'
where name = 'Will Not Do'
  and description is null;

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
    is_completed
  )
  select * from (values
    ('Backlog', 'Ideas and requests that are not ready to schedule yet.', '#64748b', 0, true, false),
    ('Todo', 'Ready to be picked up and worked on.', '#2563eb', 1, true, false),
    ('In Progress', 'Actively being worked on right now.', '#d97706', 2, true, false),
    ('In Review', 'Waiting for feedback, approval, or final checks.', '#7c3aed', 3, true, false),
    ('Done', 'Finished work that no longer needs action.', '#059669', 4, true, true),
    ('Will Not Do', 'Work that has been intentionally declined and will not be pursued.', '#f51b2b', 5, true, false)
  ) as defaults (name, description, color, sort_order, is_default, is_completed)
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
