alter table public.statuses
  add column description text
  check (description is null or char_length(description) <= 240);

update public.statuses
set description = case name
  when 'Backlog' then 'Ideas and requests that are not ready to schedule yet.'
  when 'Todo' then 'Ready to be picked up and worked on.'
  when 'In Progress' then 'Actively being worked on right now.'
  when 'In Review' then 'Waiting for feedback, approval, or final checks.'
  when 'Done' then 'Finished work that no longer needs action.'
  else description
end
where description is null;

drop function if exists public.create_status(text, text);

create function public.create_status(
  status_name text,
  status_description text,
  status_color text
)
returns setof public.statuses
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('public.statuses.ordering', 0));

  insert into public.statuses(
    name,
    description,
    color,
    sort_order,
    order_revision,
    is_default,
    is_completed
  )
  select
    status_name,
    nullif(trim(status_description), ''),
    status_color,
    count(*),
    coalesce(max(order_revision), 0),
    false,
    false
  from public.statuses
  returning id into created_id;

  return query select * from public.statuses where id = created_id;
end;
$$;

revoke all on function public.create_status(text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_status(text, text, text) to service_role;

notify pgrst, 'reload schema';
