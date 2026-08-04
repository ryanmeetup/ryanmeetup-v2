alter table public.profiles
  add column onboarding_completed boolean not null default false;

-- Existing users are grandfathered in. Profiles created after this migration
-- must complete onboarding themselves.
update public.profiles set onboarding_completed = true;

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and onboarding_completed
  );
$$;

create policy "users read own profile"
on public.profiles for select
using (id = auth.uid());
