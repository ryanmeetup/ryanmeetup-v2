-- Project access control foundation. Before enabling this migration in production,
-- promote the reviewed initial owner in the same deployment transaction:
--   update public.profiles set app_role = 'owner' where id = '<reviewed profile id>';
-- RLS remains in legacy team-visible mode until an owner exists and every project
-- has at least one grant, avoiding an accidental workspace-wide lockout.

create type public.app_role as enum ('owner', 'member');
create type public.project_permission as enum ('viewer', 'editor', 'manager');

alter table public.profiles
  add column app_role public.app_role not null default 'member';

create table public.access_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name = trim(name) and char_length(name) > 0),
  description text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.access_group_members (
  group_id uuid not null references public.access_groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create table public.project_group_grants (
  project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid not null references public.access_groups(id) on delete cascade,
  permission public.project_permission not null,
  granted_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, group_id)
);

create table public.project_user_grants (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission public.project_permission not null,
  granted_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);

create table public.permission_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index access_group_members_profile_idx on public.access_group_members(profile_id);
create index project_group_grants_group_idx on public.project_group_grants(group_id);
create index project_user_grants_profile_idx on public.project_user_grants(profile_id);
create index tasks_project_idx on public.tasks(project_id);
create index subtasks_task_idx on public.subtasks(task_id);
create index task_comments_task_idx on public.task_comments(task_id);
create index task_activity_task_idx on public.task_activity(task_id);
create index task_attachments_task_idx on public.task_attachments(task_id);
create index task_assignees_profile_idx on public.task_assignees(profile_id);
create index task_labels_label_idx on public.task_labels(label_id);
create index task_categories_category_idx on public.task_categories(category_id);

create trigger access_groups_updated_at before update on public.access_groups
for each row execute function public.touch_updated_at();
create trigger project_group_grants_updated_at before update on public.project_group_grants
for each row execute function public.touch_updated_at();
create trigger project_user_grants_updated_at before update on public.project_user_grants
for each row execute function public.touch_updated_at();

create or replace function public.is_app_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and onboarding_completed and app_role = 'owner'
  );
$$;

create or replace function public.access_control_enabled()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where app_role = 'owner')
    and not exists (select 1 from public.tasks where project_id is null)
    and not exists (
      select 1 from public.task_attachments
      where file_path is not null
        and file_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/'
    )
    and not exists (
      select 1 from public.projects p
      where not exists (select 1 from public.project_user_grants u where u.project_id = p.id)
        and not exists (select 1 from public.project_group_grants g where g.project_id = p.id)
    );
$$;

create or replace function public.project_permission_for(requested_project_id uuid)
returns public.project_permission language sql stable security definer set search_path = '' as $$
  select case
    when public.is_app_owner() then 'manager'::public.project_permission
    when not public.access_control_enabled() and public.is_team_member()
      then 'manager'::public.project_permission
    else (
      select case max(permission_rank)
        when 3 then 'manager'::public.project_permission
        when 2 then 'editor'::public.project_permission
        when 1 then 'viewer'::public.project_permission
      end
      from (
        select case permission when 'manager' then 3 when 'editor' then 2 else 1 end permission_rank
        from public.project_user_grants
        where project_id = requested_project_id and profile_id = auth.uid()
        union all
        select case pgg.permission when 'manager' then 3 when 'editor' then 2 else 1 end
        from public.project_group_grants pgg
        join public.access_group_members agm on agm.group_id = pgg.group_id
        where pgg.project_id = requested_project_id and agm.profile_id = auth.uid()
      ) grants
    )
  end;
$$;

create or replace function public.can_view_project(project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.project_permission_for(project_id) is not null;
$$;
create or replace function public.can_edit_project(project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.project_permission_for(project_id) in ('editor', 'manager');
$$;
create or replace function public.can_manage_project(project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.project_permission_for(project_id) = 'manager';
$$;
create or replace function public.can_view_task(requested_task_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_view_project(project_id) from public.tasks where id = requested_task_id;
$$;
create or replace function public.can_edit_task(requested_task_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_edit_project(project_id) from public.tasks where id = requested_task_id;
$$;
create or replace function public.task_id_from_storage_path(object_name text)
returns uuid language plpgsql immutable set search_path = '' as $$
declare candidate text;
begin
  candidate := (storage.foldername(object_name))[1];
  if candidate is null or candidate !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return candidate::uuid;
end;
$$;
create or replace function public.can_assign_to_project(requested_profile_id uuid, requested_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = requested_profile_id and p.onboarding_completed
      and (p.app_role = 'owner' or exists (
        select 1 from public.project_user_grants u
        where u.profile_id = p.id and u.project_id = requested_project_id
      ) or exists (
        select 1 from public.access_group_members m
        join public.project_group_grants g on g.group_id = m.group_id
        where m.profile_id = p.id and g.project_id = requested_project_id
      ) or not public.access_control_enabled())
  );
$$;

create or replace function public.replace_project_managers(
  requested_project_id uuid,
  requested_profile_ids uuid[]
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_manage_project(requested_project_id) then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from unnest(coalesce(requested_profile_ids, '{}'::uuid[])) requested_id
    where not exists (
      select 1 from public.profiles p
      where p.id = requested_id and p.onboarding_completed
    )
  ) then
    raise exception 'A selected project manager is not eligible';
  end if;

  delete from public.project_user_grants
  where project_id = requested_project_id and permission = 'manager';

  insert into public.project_user_grants(project_id, profile_id, permission, granted_by)
  select requested_project_id, requested_id, 'manager', auth.uid()
  from unnest(coalesce(requested_profile_ids, '{}'::uuid[])) requested_id
  on conflict (project_id, profile_id) do update
  set permission = excluded.permission, granted_by = excluded.granted_by;
end;
$$;

-- Convert the only existing explicit project access signal. Keep project_owners
-- temporarily for rollback and old clients; it is no longer authoritative.
insert into public.project_user_grants (project_id, profile_id, permission, granted_by)
select po.project_id, po.profile_id, 'manager', p.created_by
from public.project_owners po join public.projects p on p.id = po.project_id
on conflict do nothing;

drop policy if exists "team manages project owners" on public.project_owners;
create policy "owners read legacy project owners" on public.project_owners
for select using (public.is_app_owner());

create or replace function public.prevent_last_owner_removal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.app_role = 'owner' and (tg_op = 'DELETE' or new.app_role <> 'owner')
     and (select count(*) from public.profiles where app_role = 'owner') <= 1 then
    raise exception 'The last app owner cannot be removed';
  end if;
  if tg_op = 'UPDATE' and old.app_role is distinct from new.app_role
     and exists (select 1 from public.profiles where app_role = 'owner')
     and not public.is_app_owner() then
    raise exception 'Only an app owner can change app roles';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger profiles_protect_owner_role before update of app_role on public.profiles
for each row execute function public.prevent_last_owner_removal();
create trigger profiles_protect_last_owner_delete before delete on public.profiles
for each row execute function public.prevent_last_owner_removal();

create or replace function public.audit_permission_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.permission_audit_events(actor_id, action, target_type, target_id, before_state, after_state)
  values (auth.uid(), lower(tg_op), tg_table_name,
    coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(new)->>'project_id')::uuid,
             (to_jsonb(old)->>'id')::uuid, (to_jsonb(old)->>'project_id')::uuid),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;
create trigger audit_access_groups after insert or update or delete on public.access_groups
for each row execute function public.audit_permission_change();
create trigger audit_access_group_members after insert or update or delete on public.access_group_members
for each row execute function public.audit_permission_change();
create trigger audit_project_group_grants after insert or update or delete on public.project_group_grants
for each row execute function public.audit_permission_change();
create trigger audit_project_user_grants after insert or update or delete on public.project_user_grants
for each row execute function public.audit_permission_change();
create trigger audit_profile_roles after update of app_role on public.profiles
for each row execute function public.audit_permission_change();

alter table public.access_groups enable row level security;
alter table public.access_group_members enable row level security;
alter table public.project_group_grants enable row level security;
alter table public.project_user_grants enable row level security;
alter table public.permission_audit_events enable row level security;

create policy "owners manage access groups" on public.access_groups for all
using (public.is_app_owner()) with check (public.is_app_owner() and created_by = auth.uid());
create policy "members read relevant access groups" on public.access_groups for select using (
  public.is_app_owner() or exists (select 1 from public.access_group_members m where m.group_id = id and m.profile_id = auth.uid())
  or exists (select 1 from public.project_group_grants g where g.group_id = id and public.can_manage_project(g.project_id))
);
create policy "owners manage group members" on public.access_group_members for all
using (public.is_app_owner()) with check (public.is_app_owner() and added_by = auth.uid());
create policy "members read relevant memberships" on public.access_group_members for select using (
  public.is_app_owner() or profile_id = auth.uid()
  or exists (select 1 from public.project_group_grants g where g.group_id = access_group_members.group_id and public.can_manage_project(g.project_id))
);
create policy "project managers manage group grants" on public.project_group_grants for all
using (public.can_manage_project(project_id)) with check (public.can_manage_project(project_id) and granted_by = auth.uid());
create policy "members read relevant group grants" on public.project_group_grants for select using (
  public.can_view_project(project_id) and (public.can_manage_project(project_id)
    or exists (select 1 from public.access_group_members m where m.group_id = project_group_grants.group_id and m.profile_id = auth.uid()))
);
create policy "project managers manage user grants" on public.project_user_grants for all
using (public.can_manage_project(project_id)) with check (public.can_manage_project(project_id) and granted_by = auth.uid());
create policy "members read relevant user grants" on public.project_user_grants for select using (
  public.can_view_project(project_id) and (profile_id = auth.uid() or public.can_manage_project(project_id))
);
create policy "owners read permission audit" on public.permission_audit_events for select using (public.is_app_owner());

create policy "owners update profiles" on public.profiles for update
using (public.is_app_owner()) with check (public.is_app_owner());

drop policy if exists "team manages projects" on public.projects;
create policy "members view accessible projects" on public.projects for select using (public.can_view_project(id));
create policy "owners create projects" on public.projects for insert with check (public.is_app_owner() and created_by = auth.uid());
create policy "managers update projects" on public.projects for update using (public.can_manage_project(id)) with check (public.can_manage_project(id));
create policy "owners delete projects" on public.projects for delete using (public.is_app_owner());

drop policy if exists "team manages statuses" on public.statuses;
create policy "owners manage statuses" on public.statuses for all
using (public.is_app_owner()) with check (public.is_app_owner());
drop policy if exists "team manages groups" on public.work_groups;
create policy "owners manage categories" on public.work_groups for all
using (public.is_app_owner()) with check (public.is_app_owner());
drop policy if exists "team manages labels" on public.labels;
create policy "team reads labels" on public.labels for select using (public.is_team_member());
create policy "owners manage labels" on public.labels for all
using (public.is_app_owner()) with check (public.is_app_owner());

drop policy if exists "team reads tasks" on public.tasks;
drop policy if exists "team creates tasks" on public.tasks;
drop policy if exists "team updates tasks" on public.tasks;
drop policy if exists "team deletes tasks" on public.tasks;
create policy "members view accessible tasks" on public.tasks for select using (public.can_view_project(project_id));
create policy "editors create tasks" on public.tasks for insert with check (
  public.can_edit_project(project_id) and created_by = auth.uid()
  and (assignee_id is null or public.can_assign_to_project(assignee_id, project_id))
);
create policy "editors update tasks" on public.tasks for update using (public.can_edit_project(project_id))
with check (public.can_edit_project(project_id) and (assignee_id is null or public.can_assign_to_project(assignee_id, project_id)));
create policy "editors delete tasks" on public.tasks for delete using (public.can_edit_project(project_id));

drop policy if exists "team manages subtasks" on public.subtasks;
drop policy if exists "team manages comments" on public.task_comments;
drop policy if exists "team reads activity" on public.task_activity;
drop policy if exists "team adds activity" on public.task_activity;
drop policy if exists "team manages attachments" on public.task_attachments;
drop policy if exists "team manages task assignees" on public.task_assignees;
drop policy if exists "team manages task labels" on public.task_labels;
drop policy if exists "team manages task categories" on public.task_categories;
create policy "task access controls subtasks" on public.subtasks for all using (public.can_edit_task(task_id)) with check (public.can_edit_task(task_id) and created_by = auth.uid());
create policy "members view subtasks" on public.subtasks for select using (public.can_view_task(task_id));
create policy "task access controls comments" on public.task_comments for all using (public.can_edit_task(task_id)) with check (public.can_edit_task(task_id) and created_by = auth.uid());
create policy "members view comments" on public.task_comments for select using (public.can_view_task(task_id));
create policy "members view activity" on public.task_activity for select using (public.can_view_task(task_id));
create policy "editors add activity" on public.task_activity for insert with check (public.can_edit_task(task_id) and actor_id = auth.uid());
create policy "task access controls attachments" on public.task_attachments for all using (public.can_edit_task(task_id)) with check (public.can_edit_task(task_id) and created_by = auth.uid());
create policy "members view attachments" on public.task_attachments for select using (public.can_view_task(task_id));
create policy "task access controls assignees" on public.task_assignees for all using (public.can_edit_task(task_id)) with check (
  public.can_edit_task(task_id) and public.can_assign_to_project(profile_id, (select project_id from public.tasks where id = task_id))
);
create policy "members view assignees" on public.task_assignees for select using (public.can_view_task(task_id));
create policy "task access controls labels" on public.task_labels for all using (public.can_edit_task(task_id)) with check (public.can_edit_task(task_id));
create policy "members view task labels" on public.task_labels for select using (public.can_view_task(task_id));
create policy "task access controls categories" on public.task_categories for all using (public.can_edit_task(task_id)) with check (public.can_edit_task(task_id));
create policy "members view task categories" on public.task_categories for select using (public.can_view_task(task_id));

drop policy if exists "team uploads task files" on storage.objects;
drop policy if exists "team reads task files" on storage.objects;
drop policy if exists "team deletes task files" on storage.objects;
create policy "editors upload task files" on storage.objects for insert with check (
  bucket_id = 'task-attachments' and public.can_edit_task(public.task_id_from_storage_path(name))
);
create policy "members read task files" on storage.objects for select using (
  bucket_id = 'task-attachments' and public.can_view_task(public.task_id_from_storage_path(name))
);
create policy "editors delete task files" on storage.objects for delete using (
  bucket_id = 'task-attachments' and public.can_edit_task(public.task_id_from_storage_path(name))
);
create policy "legacy task files remain readable during rollout" on storage.objects for select using (
  bucket_id = 'task-attachments' and not public.access_control_enabled() and public.is_team_member()
);
create policy "legacy task files remain deletable during rollout" on storage.objects for delete using (
  bucket_id = 'task-attachments' and not public.access_control_enabled() and public.is_team_member()
);

notify pgrst, 'reload schema';
