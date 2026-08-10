-- Categories are unrestricted until at least one access group is granted to
-- them. Once restricted, users must belong to an allowed group for every
-- restricted category attached to a task. Project authorization remains an
-- independent requirement.
create table public.category_group_grants (
  category_id uuid not null references public.work_groups(id) on delete cascade,
  group_id uuid not null references public.access_groups(id) on delete cascade,
  granted_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (category_id, group_id)
);

create index category_group_grants_group_idx
  on public.category_group_grants(group_id);

alter table public.category_group_grants enable row level security;

create policy "owners manage category grants"
on public.category_group_grants for all
using (public.is_app_owner())
with check (public.is_app_owner());

create or replace function public.can_access_category(requested_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_app_owner()
    or not exists (
      select 1
      from public.category_group_grants grant_row
      where grant_row.category_id = requested_category_id
    )
    or exists (
      select 1
      from public.category_group_grants grant_row
      join public.access_group_members membership
        on membership.group_id = grant_row.group_id
      where grant_row.category_id = requested_category_id
        and membership.profile_id = auth.uid()
    );
$$;

create or replace function public.can_access_task_categories(requested_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_app_owner() or not exists (
    select 1
    from public.task_categories task_category
    where task_category.task_id = requested_task_id
      and not public.can_access_category(task_category.category_id)
  );
$$;

create or replace function public.can_view_task(requested_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    case
      when task_row.project_id is null then public.is_team_member()
      else public.can_view_project(task_row.project_id)
    end
  ) and public.can_access_task_categories(task_row.id)
  from public.tasks task_row
  where task_row.id = requested_task_id;
$$;

create or replace function public.can_edit_task(requested_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    case
      when task_row.project_id is null then public.is_team_member()
      else public.can_edit_project(task_row.project_id)
    end
  ) and public.can_access_task_categories(task_row.id)
  from public.tasks task_row
  where task_row.id = requested_task_id;
$$;

drop policy if exists "task access controls categories" on public.task_categories;
create policy "task access controls categories"
on public.task_categories for all
using (public.can_edit_task(task_id))
with check (
  public.can_edit_task(task_id)
  and public.can_access_category(category_id)
);

create or replace function public.audit_permission_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.permission_audit_events(actor_id, action, target_type, target_id, before_state, after_state)
  values (auth.uid(), lower(tg_op), tg_table_name,
    coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(new)->>'project_id')::uuid,
             (to_jsonb(new)->>'category_id')::uuid, (to_jsonb(old)->>'id')::uuid,
             (to_jsonb(old)->>'project_id')::uuid, (to_jsonb(old)->>'category_id')::uuid),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;

create trigger audit_category_group_grants
after insert or update or delete on public.category_group_grants
for each row execute function public.audit_permission_change();

notify pgrst, 'reload schema';
