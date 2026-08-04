create table public.privileged_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action = trim(action) and char_length(action) between 1 and 100),
  target_type text not null check (target_type = trim(target_type) and char_length(target_type) between 1 and 100),
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index privileged_audit_events_actor_created_idx
  on public.privileged_audit_events(actor_id, created_at desc);

alter table public.privileged_audit_events enable row level security;
create policy "owners read privileged audit" on public.privileged_audit_events
  for select using (public.is_app_owner());

create or replace function public.prevent_privileged_audit_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Privileged audit events are immutable';
end;
$$;

create trigger privileged_audit_events_immutable
before update or delete on public.privileged_audit_events
for each row execute function public.prevent_privileged_audit_mutation();

create or replace function public.record_privileged_audit_event(
  requested_actor_id uuid,
  requested_action text,
  requested_target_type text,
  requested_target_id uuid default null,
  requested_metadata jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.privileged_audit_events(actor_id, action, target_type, target_id, metadata)
  values (requested_actor_id, requested_action, requested_target_type, requested_target_id, requested_metadata);
end;
$$;

create table public.privileged_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

alter table public.privileged_rate_limits enable row level security;

create or replace function public.consume_privileged_rate_limit(
  requested_key text,
  requested_limit integer,
  requested_window_seconds integer
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_count integer;
begin
  if requested_limit < 1 or requested_window_seconds < 1 or char_length(requested_key) > 200 then
    raise exception 'Invalid rate limit configuration';
  end if;

  insert into public.privileged_rate_limits(rate_key, window_started_at, request_count)
  values (requested_key, now(), 1)
  on conflict (rate_key) do update set
    window_started_at = case
      when public.privileged_rate_limits.window_started_at <= now() - make_interval(secs => requested_window_seconds)
      then now() else public.privileged_rate_limits.window_started_at end,
    request_count = case
      when public.privileged_rate_limits.window_started_at <= now() - make_interval(secs => requested_window_seconds)
      then 1 else public.privileged_rate_limits.request_count + 1 end
  returning request_count into current_count;

  return current_count <= requested_limit;
end;
$$;

revoke all on public.privileged_audit_events from anon, authenticated;
revoke all on public.privileged_rate_limits from anon, authenticated;
revoke all on function public.record_privileged_audit_event(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.consume_privileged_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.record_privileged_audit_event(uuid, text, text, uuid, jsonb) to service_role;
grant execute on function public.consume_privileged_rate_limit(text, integer, integer) to service_role;
