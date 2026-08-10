-- Contributor is an org-chart title between the Ryan baseline and R-Suite.
-- Existing users accumulated these groups under the old additive model; retain
-- only each person's highest title now that tiers are exclusive.
alter table public.access_groups disable trigger access_groups_protect_kind;

update public.access_groups
set kind = 'tier', hierarchy_rank = 10, grants_global_content = false
where lower(name) = 'contributor';

alter table public.access_groups enable trigger access_groups_protect_kind;

select set_config('app.replacing_access_tier', 'true', true);

delete from public.access_group_members lower_membership
using public.access_groups lower_tier
where lower_membership.group_id = lower_tier.id
  and lower_tier.kind = 'tier'
  and exists (
    select 1
    from public.access_group_members higher_membership
    join public.access_groups higher_tier
      on higher_tier.id = higher_membership.group_id
    where higher_membership.profile_id = lower_membership.profile_id
      and higher_tier.kind = 'tier'
      and higher_tier.hierarchy_rank > lower_tier.hierarchy_rank
  );

select set_config('app.replacing_access_tier', 'false', true);

do $$
begin
  if exists (
    select 1
    from public.profiles profile
    where profile.app_role = 'member'
      and (
        select count(*)
        from public.access_group_members membership
        join public.access_groups access_group on access_group.id = membership.group_id
        where membership.profile_id = profile.id and access_group.kind = 'tier'
      ) <> 1
  ) then
    raise exception 'Every regular member must have exactly one organizational tier';
  end if;
end;
$$;

notify pgrst, 'reload schema';
