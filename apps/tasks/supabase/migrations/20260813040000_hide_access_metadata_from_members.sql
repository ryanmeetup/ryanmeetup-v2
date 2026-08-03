-- Access groups are an owner-only implementation detail. Authorization helpers
-- continue to resolve membership as security-definer functions, while regular
-- members cannot enumerate group names, descriptions, membership, or grants.

drop policy if exists "members read relevant access groups" on public.access_groups;
drop policy if exists "members read relevant memberships" on public.access_group_members;
drop policy if exists "members read relevant group grants" on public.project_group_grants;
drop policy if exists "project managers manage group grants" on public.project_group_grants;

create policy "owners manage project group grants"
on public.project_group_grants for all
using (public.is_app_owner())
with check (public.is_app_owner() and granted_by = auth.uid());

notify pgrst, 'reload schema';
