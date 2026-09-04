-- Page restrictions are independent of workspace-wide project/category
-- authority. A manager tier reaches a restricted page only when that tier is
-- explicitly selected; app owners retain the administrative safety override.

create or replace function public.can_view_workspace_area(requested_area text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select public.is_team_member() and (
    public.is_app_owner()
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
