-- Category owners describe the people who regularly steward a work area.
-- Ownership is metadata and does not grant category or project access.
create table public.category_owners (
  category_id uuid not null references public.work_groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (category_id, profile_id)
);

insert into public.category_owners (category_id, profile_id)
select id, created_by
from public.work_groups
where created_by is not null
on conflict do nothing;

alter table public.category_owners enable row level security;

create policy "members view category owner metadata"
on public.category_owners for select
using (public.is_team_member());

create policy "owners add category owner metadata"
on public.category_owners for insert
with check (public.is_app_owner());

create policy "owners update category owner metadata"
on public.category_owners for update
using (public.is_app_owner())
with check (public.is_app_owner());

create policy "owners delete category owner metadata"
on public.category_owners for delete
using (public.is_app_owner());

alter publication supabase_realtime add table public.category_owners;
