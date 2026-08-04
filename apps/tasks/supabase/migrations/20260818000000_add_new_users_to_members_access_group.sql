-- Keep the default access-group membership in the same transaction that
-- creates a new user's profile. If the Members group has not been created yet,
-- profile creation still succeeds and no membership is inserted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    )
  );

  insert into public.access_group_members (group_id, profile_id, added_by)
  select access_group.id, new.id, new.id
  from public.access_groups as access_group
  where lower(access_group.name) = 'members'
  on conflict (group_id, profile_id) do nothing;

  return new;
end;
$$;
