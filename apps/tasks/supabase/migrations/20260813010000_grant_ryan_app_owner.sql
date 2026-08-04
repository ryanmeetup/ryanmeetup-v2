-- Production already has this account, while fresh local and CI databases do
-- not. Keep the data migration deterministic without making a named fixture a
-- prerequisite for applying the schema.
update public.profiles
set app_role = 'owner'
where id in (
  select id from auth.users where lower(email) = 'ryan@ryanmeetup.com'
);
