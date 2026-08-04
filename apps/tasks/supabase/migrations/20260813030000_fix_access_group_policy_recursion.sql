-- Cross-table policy subqueries can cause PostgreSQL to expand the policies on
-- those tables and detect a recursive access_group_members policy. Keep these
-- checks behind security-definer functions so their internal reads bypass RLS.

create or replace function public.is_access_group_member(requested_group_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.access_group_members
    where group_id = requested_group_id and profile_id = auth.uid()
  );
$$;

create or replace function public.can_manage_group_projects(requested_group_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.project_group_grants
    where group_id = requested_group_id
      and public.can_manage_project(project_id)
  );
$$;

drop policy if exists "members read relevant access groups" on public.access_groups;
create policy "members read relevant access groups"
on public.access_groups for select using (
  public.is_app_owner()
  or public.is_access_group_member(id)
  or public.can_manage_group_projects(id)
);

drop policy if exists "members read relevant memberships" on public.access_group_members;
create policy "members read relevant memberships"
on public.access_group_members for select using (
  public.is_app_owner()
  or profile_id = auth.uid()
  or public.can_manage_group_projects(group_id)
);

drop policy if exists "members read relevant group grants" on public.project_group_grants;
create policy "members read relevant group grants"
on public.project_group_grants for select using (
  public.can_view_project(project_id)
  and (
    public.can_manage_project(project_id)
    or public.is_access_group_member(group_id)
  )
);

notify pgrst, 'reload schema';
