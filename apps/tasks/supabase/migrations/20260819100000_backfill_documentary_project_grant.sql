-- Reviewed production backfill: the Ryan Documentary project belongs to the
-- Documentary Team group. Keep this mapping explicit rather than granting all
-- creator groups or adding a runtime authorization fallback.
do $$
declare
  documentary_project_id constant uuid := '717ee542-8dc6-43ea-bfdc-88ce5b621ff1';
  documentary_group_id constant uuid := '05f34552-b3c7-4419-bdfe-45106a2ffaae';
  project_creator_id uuid;
begin
  select created_by into project_creator_id
  from public.projects
  where id = documentary_project_id and name = 'Ryan Documentary';

  -- A fresh local/CI database has neither production row. There is nothing to
  -- backfill there; still fail if only one side exists or production drifted.
  if project_creator_id is null and not exists (
    select 1 from public.access_groups where id = documentary_group_id
  ) then
    return;
  end if;

  if project_creator_id is null then
    raise exception 'Reviewed Ryan Documentary project was not found';
  end if;

  if not exists (
    select 1 from public.access_groups
    where id = documentary_group_id and name = 'Documentary Team'
  ) then
    raise exception 'Reviewed Documentary Team access group was not found';
  end if;

  insert into public.project_group_grants (
    project_id,
    group_id,
    permission,
    granted_by
  ) values (
    documentary_project_id,
    documentary_group_id,
    'viewer',
    project_creator_id
  )
  on conflict (project_id, group_id) do nothing;
end;
$$;
