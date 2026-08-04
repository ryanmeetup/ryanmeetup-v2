-- Keep newly created projects visible to the teams the creator already belongs
-- to. Viewer matches the default permission used when an owner manually adds a
-- project to an access group.

create or replace function public.grant_new_project_to_creator_groups()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_group_grants (
    project_id,
    group_id,
    permission,
    granted_by
  )
  select
    new.id,
    membership.group_id,
    'viewer'::public.project_permission,
    new.created_by
  from public.access_group_members membership
  where membership.profile_id = new.created_by;

  return new;
end;
$$;

create trigger projects_grant_creator_groups
after insert on public.projects
for each row execute function public.grant_new_project_to_creator_groups();
