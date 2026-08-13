create or replace function public.set_category_access(
  requested_category_id uuid,
  requested_access_mode text,
  requested_group_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_app_owner() then
    raise exception 'Only app owners may change category access'
      using errcode = '42501';
  end if;
  if requested_access_mode not in ('open', 'restricted') then
    raise exception 'Invalid category access mode' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.work_groups where id = requested_category_id
  ) then
    raise exception 'Category not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1
    from unnest(coalesce(requested_group_ids, '{}'::uuid[])) requested_group_id
    where not exists (
      select 1 from public.access_groups
      where id = requested_group_id and not grants_global_content
    )
  ) then
    raise exception 'Invalid access group' using errcode = '23514';
  end if;

  update public.work_groups
  set access_mode = requested_access_mode
  where id = requested_category_id;

  delete from public.category_group_grants
  where category_id = requested_category_id;

  if requested_access_mode = 'restricted' then
    insert into public.category_group_grants (
      category_id, group_id, granted_by
    )
    select requested_category_id, requested_group_id, auth.uid()
    from unnest(coalesce(requested_group_ids, '{}'::uuid[])) requested_group_id;
  end if;
end;
$$;

grant execute on function public.set_category_access(uuid, text, uuid[])
to authenticated;
notify pgrst, 'reload schema';
