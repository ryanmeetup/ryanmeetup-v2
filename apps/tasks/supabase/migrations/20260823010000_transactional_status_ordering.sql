alter table public.statuses
  add column order_revision bigint not null default 0;

-- Repair any pre-existing collisions before enforcing the ordering invariant.
with normalized as (
  select id, row_number() over (order by sort_order, id) - 1 as sort_order
  from public.statuses
)
update public.statuses as statuses
set sort_order = normalized.sort_order
from normalized
where statuses.id = normalized.id;

alter table public.statuses
  add constraint statuses_sort_order_unique
  unique (sort_order) deferrable initially deferred;

create or replace function public.reorder_statuses(
  ordered_status_ids uuid[],
  expected_revision bigint
)
returns setof public.statuses
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_revision bigint;
  status_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('public.statuses.ordering', 0));

  select count(*), coalesce(max(order_revision), 0)
  into status_count, current_revision
  from public.statuses;

  if expected_revision is null or expected_revision <> current_revision then
    raise exception using
      errcode = '40001',
      message = 'The status ordering revision is stale';
  end if;

  if coalesce(cardinality(ordered_status_ids), 0) <> status_count
     or (select count(distinct id) from unnest(ordered_status_ids) as ids(id)) <> status_count
     or exists (
       select 1 from unnest(ordered_status_ids) as ids(id)
       where not exists (select 1 from public.statuses where statuses.id = ids.id)
     ) then
    raise exception using
      errcode = 'P0002',
      message = 'The status list changed';
  end if;

  update public.statuses as statuses
  set sort_order = (requested.position - 1)::integer,
      order_revision = current_revision + 1
  from unnest(ordered_status_ids) with ordinality as requested(id, position)
  where statuses.id = requested.id;

  return query
    select * from public.statuses order by sort_order;
end;
$$;

create or replace function public.create_status(status_name text, status_color text)
returns setof public.statuses
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('public.statuses.ordering', 0));

  insert into public.statuses(name, color, sort_order, order_revision, is_default, is_completed)
  select status_name, status_color, count(*), coalesce(max(order_revision), 0), false, false
  from public.statuses
  returning id into created_id;

  return query select * from public.statuses where id = created_id;
end;
$$;

create or replace function public.delete_status(status_id uuid)
returns table(id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('public.statuses.ordering', 0));

  return query delete from public.statuses where statuses.id = status_id returning statuses.id;

  with normalized as (
    select statuses.id, row_number() over (order by sort_order, statuses.id) - 1 as sort_order
    from public.statuses as statuses
  )
  update public.statuses as statuses
  set sort_order = normalized.sort_order
  from normalized
  where statuses.id = normalized.id;
end;
$$;

revoke all on function public.reorder_statuses(uuid[], bigint) from public, anon, authenticated;
revoke all on function public.create_status(text, text) from public, anon, authenticated;
revoke all on function public.delete_status(uuid) from public, anon, authenticated;
grant execute on function public.reorder_statuses(uuid[], bigint) to service_role;
grant execute on function public.create_status(text, text) to service_role;
grant execute on function public.delete_status(uuid) to service_role;

notify pgrst, 'reload schema';
