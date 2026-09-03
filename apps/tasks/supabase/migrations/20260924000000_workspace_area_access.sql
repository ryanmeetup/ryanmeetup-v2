-- Lock a whole page behind access groups.
--
-- Until now the only thing standing between an onboarded member and Notes,
-- Contacts, or the Calendar was `is_team_member()`. Projects and categories
-- each carry a visibility mode and a set of selected access groups; a page
-- carried nothing, so restricting one meant restricting every category that
-- fed it. The one adjacent switch, `access_groups.calendar_access`, is a
-- narrower thing entirely: it decides whether the Google feed renders inside
-- the calendar page, not whether the page opens at all. It keeps that job.
--
-- A page gets the shape categories already use: `open` or `restricted`, and
-- when restricted a set of selected groups, replaced atomically. A restricted
-- page with no selected groups is therefore workspace-manager-only, exactly as
-- a restricted category with no grants is.
--
-- The set of lockable pages lives in the application (`lib/access/workspace-
-- areas.ts`), not in an enum here. A row exists only once an owner configures
-- that page, and no row means open, so adding a page later is a constant in
-- the registry rather than a migration.

create table if not exists public.workspace_area_access (
  area text primary key,
  access_mode text not null default 'open',
  updated_at timestamp with time zone not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint workspace_area_access_area_check
    check (area = btrim(area) and char_length(area) between 1 and 40),
  constraint workspace_area_access_mode_check
    check (access_mode in ('open', 'restricted'))
);

comment on table public.workspace_area_access is
  'Per-page visibility. A page with no row here is open to every onboarded member.';

create table if not exists public.workspace_area_group_grants (
  area text not null
    references public.workspace_area_access(area) on update cascade on delete cascade,
  group_id uuid not null
    references public.access_groups(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  primary key (area, group_id)
);

comment on table public.workspace_area_group_grants is
  'Access groups selected for a restricted page. Ignored while the page is open.';

create index if not exists workspace_area_group_grants_group_idx
  on public.workspace_area_group_grants using btree (group_id);

alter table public.workspace_area_access enable row level security;
alter table public.workspace_area_group_grants enable row level security;

-- Which groups reach a page is owner-only administrative data, the way
-- category grants are. Members never read these tables: they ask
-- `accessible_workspace_areas`, which answers about themselves only.
drop policy if exists "owners manage workspace area access"
  on public.workspace_area_access;
create policy "owners manage workspace area access"
  on public.workspace_area_access
  using (public.is_app_owner())
  with check (public.is_app_owner());

drop policy if exists "owners manage workspace area grants"
  on public.workspace_area_group_grants;
create policy "owners manage workspace area grants"
  on public.workspace_area_group_grants
  using (public.is_app_owner())
  with check (public.is_app_owner());

create or replace trigger audit_workspace_area_access
  after insert or delete or update on public.workspace_area_access
  for each row execute function public.audit_permission_change();

create or replace trigger audit_workspace_area_group_grants
  after insert or delete or update on public.workspace_area_group_grants
  for each row execute function public.audit_permission_change();


-- Fails closed on the group side and open on the page side: an unconfigured
-- page is open by design, but once a page is restricted only workspace-wide
-- content authority or a selected group reaches it.
create or replace function public.can_view_workspace_area(requested_area text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select public.is_team_member() and (
    public.has_global_content_access(auth.uid())
    or not exists (
      select 1
      from public.workspace_area_access area_row
      where area_row.area = requested_area
        and area_row.access_mode = 'restricted'
    )
    or exists (
      select 1
      from public.workspace_area_group_grants grant_row
      where grant_row.area = requested_area
        and public.member_has_group_access(auth.uid(), grant_row.group_id)
    )
  );
$function$;

alter function public.can_view_workspace_area(text) owner to postgres;

-- The caller passes the pages it knows about, so the registry stays in the
-- application and this answers only about the current member.
create or replace function public.accessible_workspace_areas(requested_areas text[])
returns text[]
language sql
stable
security definer
set search_path to ''
as $function$
  select coalesce(
    array_agg(candidate order by candidate)
      filter (where public.can_view_workspace_area(candidate)),
    '{}'::text[]
  )
  from unnest(coalesce(requested_areas, '{}'::text[])) as candidate;
$function$;

alter function public.accessible_workspace_areas(text[]) owner to postgres;

-- One transaction: the mode and the complete selected-group set. A partial
-- write must never leave a page restricted with stale grants, or open with
-- none.
create or replace function public.set_workspace_area_access(
  requested_area text,
  requested_access_mode text,
  requested_group_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  normalized_area text := btrim(coalesce(requested_area, ''));
  normalized_group_ids uuid[] := coalesce(requested_group_ids, '{}'::uuid[]);
begin
  if not public.is_app_owner() then
    raise exception 'Only app owners may change page access'
      using errcode = '42501';
  end if;
  if normalized_area = '' or char_length(normalized_area) > 40 then
    raise exception 'Invalid page' using errcode = 'RS001';
  end if;
  if requested_access_mode not in ('open', 'restricted') then
    raise exception 'Invalid page access mode' using errcode = 'RS001';
  end if;
  if exists (
    select 1
    from unnest(normalized_group_ids) requested_group_id
    where not exists (
      select 1 from public.access_groups
      where id = requested_group_id and not grants_global_content
    )
  ) then
    raise exception 'Invalid access group' using errcode = 'RS001';
  end if;

  insert into public.workspace_area_access (area, access_mode, updated_at, updated_by)
  values (normalized_area, requested_access_mode, now(), auth.uid())
  on conflict (area) do update
    set access_mode = excluded.access_mode,
        updated_at = now(),
        updated_by = auth.uid();

  delete from public.workspace_area_group_grants
  where area = normalized_area;

  if requested_access_mode = 'restricted' then
    insert into public.workspace_area_group_grants (area, group_id, granted_by)
    select normalized_area, requested_group_id, auth.uid()
    from unnest(normalized_group_ids) requested_group_id;
  end if;
end;
$function$;

alter function public.set_workspace_area_access(text, text, uuid[]) owner to postgres;

revoke all on function public.can_view_workspace_area(text) from public;
grant execute on function public.can_view_workspace_area(text) to authenticated, service_role;
revoke all on function public.accessible_workspace_areas(text[]) from public;
grant execute on function public.accessible_workspace_areas(text[]) to authenticated, service_role;
revoke all on function public.set_workspace_area_access(text, text, uuid[]) from public;
grant execute on function public.set_workspace_area_access(text, text, uuid[]) to authenticated, service_role;

grant select, insert, update, delete on table public.workspace_area_access
  to authenticated, service_role;
grant select, insert, update, delete on table public.workspace_area_group_grants
  to authenticated, service_role;


-- The pages themselves. `can_view_workspace_area` already contains
-- `is_team_member()`, so it replaces that check rather than joining it.

-- Notes. `note_comments` reaches its note through an RLS-filtered subquery, so
-- locking the notes table locks the comments with it.
drop policy if exists "members read notes" on public.notes;
create policy "members read notes" on public.notes for select
  using (
    public.can_view_workspace_area('notes')
    and (category_id is null or public.can_access_category(category_id))
  );

drop policy if exists "members create notes" on public.notes;
create policy "members create notes" on public.notes for insert
  with check (
    public.can_view_workspace_area('notes')
    and created_by = auth.uid()
    and converted_task_id is null
    and (category_id is null or public.can_access_category(category_id))
  );

drop policy if exists "members update notes" on public.notes;
create policy "members update notes" on public.notes for update
  using (
    public.can_view_workspace_area('notes')
    and (category_id is null or public.can_access_category(category_id))
  )
  with check (
    public.can_view_workspace_area('notes')
    and (category_id is null or public.can_access_category(category_id))
  );

drop policy if exists "members delete notes" on public.notes;
create policy "members delete notes" on public.notes for delete
  using (
    public.can_view_workspace_area('notes')
    and (category_id is null or public.can_access_category(category_id))
  );

-- Contacts, including the people, the contact categories, and their
-- assignments: the whole directory is one page.
drop policy if exists "team manages contacts" on public.contacts;
create policy "team manages contacts" on public.contacts
  using (public.can_view_workspace_area('contacts'))
  with check (
    public.can_view_workspace_area('contacts') and created_by = auth.uid()
  );

drop policy if exists "team manages contact people" on public.contact_people;
create policy "team manages contact people" on public.contact_people
  using (public.can_view_workspace_area('contacts'))
  with check (public.can_view_workspace_area('contacts'));

drop policy if exists "team manages contact categories" on public.contact_categories;
create policy "team manages contact categories" on public.contact_categories
  using (public.can_view_workspace_area('contacts'))
  with check (
    public.can_view_workspace_area('contacts') and created_by = auth.uid()
  );

drop policy if exists "team manages contact assignments"
  on public.contact_category_assignments;
create policy "team manages contact assignments" on public.contact_category_assignments
  using (public.can_view_workspace_area('contacts'))
  with check (public.can_view_workspace_area('contacts'));

-- Contact images live in a public bucket, so an existing URL stays reachable;
-- what the page access decides here is who may add, replace, or remove one.
drop policy if exists "team uploads organization images" on storage.objects;
create policy "team uploads organization images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'organization-images'
    and public.can_view_workspace_area('contacts')
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists "team updates organization images" on storage.objects;
create policy "team updates organization images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'organization-images'
    and public.can_view_workspace_area('contacts')
    and owner_id = (auth.uid())::text
  )
  with check (
    bucket_id = 'organization-images'
    and public.can_view_workspace_area('contacts')
    and owner_id = (auth.uid())::text
  );

drop policy if exists "team deletes organization images" on storage.objects;
create policy "team deletes organization images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'organization-images'
    and public.can_view_workspace_area('contacts')
    and owner_id = (auth.uid())::text
  );

-- Calendar. Away days stay readable to everyone who reaches the page, the way
-- they already skip the project and category checks.
drop policy if exists "calendar_events_select" on public.calendar_events;
create policy "calendar_events_select" on public.calendar_events for select to authenticated
  using (
    public.can_view_workspace_area('calendar')
    and (
      kind = 'away'
      or (
        (project_id is null or public.can_view_project(project_id))
        and (category_id is null or public.can_access_category(category_id))
      )
    )
  );

drop policy if exists "calendar_events_insert" on public.calendar_events;
create policy "calendar_events_insert" on public.calendar_events for insert to authenticated
  with check (
    public.can_view_workspace_area('calendar')
    and created_by = auth.uid()
    and (
      kind <> 'away'
      or exists (
        select 1 from public.profiles away_profile
        where away_profile.id = calendar_events.profile_id
          and away_profile.onboarding_completed
      )
    )
    and (project_id is null or public.can_edit_project(project_id))
    and (category_id is null or public.can_access_category(category_id))
  );

-- App owners keep their override on write, but never on a page they cannot
-- reach: an owner always reaches every page through
-- `has_global_content_access`.
drop policy if exists "calendar_events_update" on public.calendar_events;
create policy "calendar_events_update" on public.calendar_events for update to authenticated
  using (
    public.can_view_workspace_area('calendar')
    and (
      public.is_app_owner()
      or (
        (created_by = auth.uid() or profile_id = auth.uid())
        and (project_id is null or public.can_edit_project(project_id))
        and (category_id is null or public.can_access_category(category_id))
      )
    )
  )
  with check (
    public.can_view_workspace_area('calendar')
    and (
      public.is_app_owner()
      or (
        (created_by = auth.uid() or profile_id = auth.uid())
        and (
          kind <> 'away'
          or exists (
            select 1 from public.profiles away_profile
            where away_profile.id = calendar_events.profile_id
              and away_profile.onboarding_completed
          )
        )
        and (project_id is null or public.can_edit_project(project_id))
        and (category_id is null or public.can_access_category(category_id))
      )
    )
  );

drop policy if exists "calendar_events_delete" on public.calendar_events;
create policy "calendar_events_delete" on public.calendar_events for delete to authenticated
  using (
    public.can_view_workspace_area('calendar')
    and (
      public.is_app_owner()
      or (
        (created_by = auth.uid() or profile_id = auth.uid())
        and (project_id is null or public.can_edit_project(project_id))
        and (category_id is null or public.can_access_category(category_id))
      )
    )
  );

-- The Google feed stays a sub-permission of the calendar page: reaching the
-- page is decided above, and this decides whether synced events render on it.
create or replace function public.can_view_workspace_calendar()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select public.can_view_workspace_area('calendar') and (
    public.is_app_owner()
    or exists (
      select 1
      from public.access_group_members membership
      join public.access_groups access_group
        on access_group.id = membership.group_id
      where membership.profile_id = auth.uid()
        and access_group.calendar_access
    )
    or exists (
      select 1
      from public.access_group_members membership
      join public.access_groups member_tier
        on member_tier.id = membership.group_id
       and member_tier.kind = 'tier'
      join public.access_groups granted_tier
        on granted_tier.kind = 'tier'
       and granted_tier.calendar_access
       and granted_tier.hierarchy_rank <= member_tier.hierarchy_rank
      where membership.profile_id = auth.uid()
    )
  );
$function$;

alter function public.can_view_workspace_calendar() owner to postgres;
