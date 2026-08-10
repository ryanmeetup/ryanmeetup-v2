-- Projectless tasks belong to the shared workspace, so any onboarded team
-- member remains an eligible assignee. Project tasks still require inherited
-- project access unless the profile has global content access.
create or replace function public.can_assign_to_project(
  requested_profile_id uuid,
  requested_project_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles profile
    where profile.id = requested_profile_id
      and profile.onboarding_completed
      and (
        requested_project_id is null
        or public.has_global_content_access(profile.id)
        or exists (
          select 1 from public.project_group_grants grant_row
          where grant_row.project_id = requested_project_id
            and public.member_has_group_access(profile.id, grant_row.group_id)
        )
      )
  );
$$;

notify pgrst, 'reload schema';
