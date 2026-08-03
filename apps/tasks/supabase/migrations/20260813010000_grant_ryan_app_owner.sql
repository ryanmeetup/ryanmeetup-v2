do $$
declare
  target_profile_id uuid;
begin
  select id into target_profile_id
  from auth.users
  where lower(email) = 'ryan@ryanmeetup.com';

  if target_profile_id is null then
    raise exception 'No auth user exists for ryan@ryanmeetup.com';
  end if;

  update public.profiles
  set app_role = 'owner'
  where id = target_profile_id;

  if not found then
    raise exception 'No profile exists for ryan@ryanmeetup.com';
  end if;
end;
$$;
