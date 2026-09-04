-- Row level security was costing far more than the rows it protected.
--
-- Reading the 254 rows of `task_categories` as an ordinary member took 583 ms
-- and 10,613 buffer hits, because every row ran the whole permission chain
-- twice: once for the SELECT policy's `can_view_task`, and again for the
-- `FOR ALL` policy's `can_edit_task`. Each of those walks tasks -> projects ->
-- grants -> access groups -> profiles. Across the workspace that made
-- `profiles` — thirteen rows — the most sequentially scanned relation in the
-- database, at 5.4 million scans and 50 million tuples read, and left the
-- instance permanently above its burstable CPU baseline.
--
-- Three mechanical changes. None of them changes who can read or write what.
--
--   1. A `FOR ALL` policy also arms SELECT. Where a table already had its own
--      SELECT policy whose predicate is strictly wider — an editor can always
--      view, an owner is always a team member, a project manager can always
--      see the project — the write policy's read arm only ever duplicated
--      work. Those are respelled as explicit INSERT, UPDATE and DELETE
--      policies carrying the same predicates.
--
--   2. Predicates that depend only on the caller and not on the row —
--      `auth.uid()`, `is_app_owner()`, `is_team_member()`,
--      `can_manage_categories()`, `can_view_workspace_area(...)` — are wrapped
--      in a scalar subquery. The planner then hoists them into an InitPlan
--      evaluated once per statement instead of once per row. This is what the
--      `auth_rls_initplan` database advisor asks for.
--
--   3. "Can you see this task" is exactly the `tasks` SELECT policy, so the
--      task-child tables ask `task_id in (select id from public.tasks)` and
--      let one hashed subplan answer for every row. Projects and notes get the
--      same treatment, because their SELECT policies are likewise exactly
--      `can_view_project(id)` and the notes predicate. The subqueries run with
--      row level security on, which is the point: the referenced table answers
--      for itself.
--
-- `work_groups` deliberately does not get that third treatment. Its `FOR ALL`
-- management policy also arms SELECT, so reading it answers "reachable OR
-- manageable" rather than "reachable", and substituting it for
-- `can_access_category(...)` would widen what a category manager sees.
-- Category checks stay as direct calls.
--
-- Write policies keep calling the per-row helpers directly. A write already
-- names the rows it touches, so there is nothing to hoist, and the helper
-- stays the one place the rule is written down.

--------------------------------------------------------------------------------
-- Task children: one hashed subplan instead of a per-row permission walk.
--------------------------------------------------------------------------------

drop policy if exists "members view subtasks" on public.subtasks;
create policy "members view subtasks" on public.subtasks
  for select using (task_id in (select id from public.tasks));

drop policy if exists "members view activity" on public.task_activity;
create policy "members view activity" on public.task_activity
  for select using (task_id in (select id from public.tasks));

drop policy if exists "members view assignees" on public.task_assignees;
create policy "members view assignees" on public.task_assignees
  for select using (task_id in (select id from public.tasks));

drop policy if exists "members view attachments" on public.task_attachments;
create policy "members view attachments" on public.task_attachments
  for select using (task_id in (select id from public.tasks));

drop policy if exists "members view task categories" on public.task_categories;
create policy "members view task categories" on public.task_categories
  for select using (task_id in (select id from public.tasks));

drop policy if exists "members view comments" on public.task_comments;
create policy "members view comments" on public.task_comments
  for select using (task_id in (select id from public.tasks));

drop policy if exists "members view task labels" on public.task_labels;
create policy "members view task labels" on public.task_labels
  for select using (task_id in (select id from public.tasks));

--------------------------------------------------------------------------------
-- Task children: the write policies stop arming SELECT.
--------------------------------------------------------------------------------

drop policy if exists "task access controls subtasks" on public.subtasks;
drop policy if exists "editors insert subtasks" on public.subtasks;
create policy "editors insert subtasks" on public.subtasks
  for insert with check (
    public.can_edit_task(task_id) and created_by = (select auth.uid())
  );
drop policy if exists "editors update subtasks" on public.subtasks;
create policy "editors update subtasks" on public.subtasks
  for update using (public.can_edit_task(task_id))
  with check (
    public.can_edit_task(task_id) and created_by = (select auth.uid())
  );
drop policy if exists "editors delete subtasks" on public.subtasks;
create policy "editors delete subtasks" on public.subtasks
  for delete using (public.can_edit_task(task_id));

drop policy if exists "task access controls assignees" on public.task_assignees;
drop policy if exists "editors insert assignees" on public.task_assignees;
create policy "editors insert assignees" on public.task_assignees
  for insert with check (
    public.can_edit_task(task_id)
    and public.can_assign_to_project(
      profile_id,
      (
        select tasks.project_id
        from public.tasks
        where tasks.id = task_assignees.task_id
      )
    )
  );
drop policy if exists "editors update assignees" on public.task_assignees;
create policy "editors update assignees" on public.task_assignees
  for update using (public.can_edit_task(task_id))
  with check (
    public.can_edit_task(task_id)
    and public.can_assign_to_project(
      profile_id,
      (
        select tasks.project_id
        from public.tasks
        where tasks.id = task_assignees.task_id
      )
    )
  );
drop policy if exists "editors delete assignees" on public.task_assignees;
create policy "editors delete assignees" on public.task_assignees
  for delete using (public.can_edit_task(task_id));

drop policy if exists "task access controls attachments" on public.task_attachments;
drop policy if exists "editors insert attachments" on public.task_attachments;
create policy "editors insert attachments" on public.task_attachments
  for insert with check (
    public.can_edit_task(task_id) and created_by = (select auth.uid())
  );
drop policy if exists "editors update attachments" on public.task_attachments;
create policy "editors update attachments" on public.task_attachments
  for update using (public.can_edit_task(task_id))
  with check (
    public.can_edit_task(task_id) and created_by = (select auth.uid())
  );
drop policy if exists "editors delete attachments" on public.task_attachments;
create policy "editors delete attachments" on public.task_attachments
  for delete using (public.can_edit_task(task_id));

drop policy if exists "task access controls categories" on public.task_categories;
drop policy if exists "editors insert task categories" on public.task_categories;
create policy "editors insert task categories" on public.task_categories
  for insert with check (
    public.can_edit_task(task_id) and public.can_access_category(category_id)
  );
drop policy if exists "editors update task categories" on public.task_categories;
create policy "editors update task categories" on public.task_categories
  for update using (public.can_edit_task(task_id))
  with check (
    public.can_edit_task(task_id) and public.can_access_category(category_id)
  );
drop policy if exists "editors delete task categories" on public.task_categories;
create policy "editors delete task categories" on public.task_categories
  for delete using (public.can_edit_task(task_id));

drop policy if exists "task access controls labels" on public.task_labels;
drop policy if exists "editors insert task labels" on public.task_labels;
create policy "editors insert task labels" on public.task_labels
  for insert with check (public.can_edit_task(task_id));
drop policy if exists "editors update task labels" on public.task_labels;
create policy "editors update task labels" on public.task_labels
  for update using (public.can_edit_task(task_id))
  with check (public.can_edit_task(task_id));
drop policy if exists "editors delete task labels" on public.task_labels;
create policy "editors delete task labels" on public.task_labels
  for delete using (public.can_edit_task(task_id));

drop policy if exists "editors add activity" on public.task_activity;
create policy "editors add activity" on public.task_activity
  for insert with check (
    public.can_edit_task(task_id) and actor_id = (select auth.uid())
  );

drop policy if exists "task access controls comment creation" on public.task_comments;
create policy "task access controls comment creation" on public.task_comments
  for insert with check (
    public.can_edit_task(task_id) and created_by = (select auth.uid())
  );

drop policy if exists "comment authors update comments" on public.task_comments;
create policy "comment authors update comments" on public.task_comments
  for update using (
    public.can_edit_task(task_id) and created_by = (select auth.uid())
  )
  with check (
    public.can_edit_task(task_id) and created_by = (select auth.uid())
  );

drop policy if exists "comment authors delete comments" on public.task_comments;
create policy "comment authors delete comments" on public.task_comments
  for delete using (
    public.can_edit_task(task_id) and created_by = (select auth.uid())
  );

--------------------------------------------------------------------------------
-- Tasks: the team, project and category checks are constant across the scan.
--------------------------------------------------------------------------------

-- A workspace has a handful of categories and hundreds of tasks, but
-- `can_access_task_categories` re-derived reachability for every category of
-- every task, so the same dozen answers were recomputed hundreds of times.
-- Ask each category once, then let one hashed subplan name the tasks that are
-- out of reach. Both functions are `security definer` for the same reason
-- `can_access_task_categories` is: the tags on a task you cannot see must
-- still be able to hide it from you.
create or replace function public.reachable_category_ids()
  returns setof uuid
  language sql
  stable
  security definer
  set search_path to ''
as $$
  select category.id
  from public.work_groups category
  where public.can_access_category(category.id)
$$;

comment on function public.reachable_category_ids() is
  'Categories the caller can reach, resolved once per statement. Reveals nothing that can_access_category does not already answer one id at a time.';

create or replace function public.tasks_with_unreachable_categories()
  returns setof uuid
  language sql
  stable
  security definer
  set search_path to ''
as $$
  select distinct task_category.task_id
  from public.task_categories task_category
  where task_category.category_id not in (select public.reachable_category_ids())
$$;

comment on function public.tasks_with_unreachable_categories() is
  'Tasks carrying at least one category the caller cannot reach — the set form of can_access_task_categories, for use as a single subplan in a policy.';

drop policy if exists "members view accessible tasks" on public.tasks;
create policy "members view accessible tasks" on public.tasks
  for select using (
    (
      case
        when project_id is null then (select public.is_team_member())
        else project_id in (select id from public.projects)
      end
    )
    and (
      (select public.is_app_owner())
      or id not in (select public.tasks_with_unreachable_categories())
    )
  );

drop policy if exists "editors create tasks" on public.tasks;
create policy "editors create tasks" on public.tasks
  for insert with check (
    (select public.is_app_owner())
    or (
      (
        (project_id is null and (select public.is_team_member()))
        or public.can_edit_project(project_id)
      )
      and created_by = (select auth.uid())
      and (assignee_id is null or public.can_assign_to_project(assignee_id, project_id))
    )
  );

drop policy if exists "editors update tasks" on public.tasks;
create policy "editors update tasks" on public.tasks
  for update using (public.can_edit_task(id))
  with check (
    (
      (project_id is null and (select public.is_team_member()))
      or public.can_edit_project(project_id)
    )
    and public.can_access_task_categories(id)
    and (assignee_id is null or public.can_assign_to_project(assignee_id, project_id))
  );

--------------------------------------------------------------------------------
-- Projects and their children.
--------------------------------------------------------------------------------

drop policy if exists "owners create projects" on public.projects;
create policy "owners create projects" on public.projects
  for insert with check (
    (select public.is_app_owner()) and created_by = (select auth.uid())
  );

drop policy if exists "members view project attachments" on public.project_attachments;
create policy "members view project attachments" on public.project_attachments
  for select using (project_id in (select id from public.projects));

drop policy if exists "editors create project attachments" on public.project_attachments;
create policy "editors create project attachments" on public.project_attachments
  for insert with check (
    public.can_edit_project(project_id) and created_by = (select auth.uid())
  );

drop policy if exists "members view accessible project owner metadata" on public.project_owners;
create policy "members view accessible project owner metadata" on public.project_owners
  for select using (project_id in (select id from public.projects));

drop policy if exists "project managers manage user grants" on public.project_user_grants;
drop policy if exists "managers insert user grants" on public.project_user_grants;
create policy "managers insert user grants" on public.project_user_grants
  for insert with check (
    public.can_manage_project(project_id) and granted_by = (select auth.uid())
  );
drop policy if exists "managers update user grants" on public.project_user_grants;
create policy "managers update user grants" on public.project_user_grants
  for update using (public.can_manage_project(project_id))
  with check (
    public.can_manage_project(project_id) and granted_by = (select auth.uid())
  );
drop policy if exists "managers delete user grants" on public.project_user_grants;
create policy "managers delete user grants" on public.project_user_grants
  for delete using (public.can_manage_project(project_id));

drop policy if exists "members read relevant user grants" on public.project_user_grants;
create policy "members read relevant user grants" on public.project_user_grants
  for select using (
    project_id in (select id from public.projects)
    and (
      profile_id = (select auth.uid())
      or public.can_manage_project(project_id)
    )
  );

drop policy if exists "owners manage project group grants" on public.project_group_grants;
create policy "owners manage project group grants" on public.project_group_grants
  for all using ((select public.is_app_owner()))
  with check (
    (select public.is_app_owner()) and granted_by = (select auth.uid())
  );

--------------------------------------------------------------------------------
-- Categories and category attachments.
--------------------------------------------------------------------------------

drop policy if exists "members view category attachments" on public.category_attachments;
create policy "members view category attachments" on public.category_attachments
  for select using (public.can_access_category(category_id));

drop policy if exists "r suite creates category attachments" on public.category_attachments;
create policy "r suite creates category attachments" on public.category_attachments
  for insert with check (
    (select public.can_manage_categories()) and created_by = (select auth.uid())
  );

drop policy if exists "r suite deletes category attachments" on public.category_attachments;
create policy "r suite deletes category attachments" on public.category_attachments
  for delete using ((select public.can_manage_categories()));

drop policy if exists "managers update category attachments" on public.category_attachments;
create policy "managers update category attachments" on public.category_attachments
  for update using ((select public.can_manage_categories()))
  with check ((select public.can_manage_categories()));

drop policy if exists "r suite manages category content" on public.work_groups;
create policy "r suite manages category content" on public.work_groups
  for all using ((select public.can_manage_categories()))
  with check ((select public.can_manage_categories()));

drop policy if exists "owners manage category grants" on public.category_group_grants;
create policy "owners manage category grants" on public.category_group_grants
  for all using ((select public.is_app_owner()))
  with check ((select public.is_app_owner()));

drop policy if exists "members view category owner metadata" on public.category_owners;
create policy "members view category owner metadata" on public.category_owners
  for select using ((select public.is_team_member()));

drop policy if exists "owners add category owner metadata" on public.category_owners;
create policy "owners add category owner metadata" on public.category_owners
  for insert with check ((select public.is_app_owner()));

drop policy if exists "owners update category owner metadata" on public.category_owners;
create policy "owners update category owner metadata" on public.category_owners
  for update using ((select public.is_app_owner()))
  with check ((select public.is_app_owner()));

drop policy if exists "owners delete category owner metadata" on public.category_owners;
create policy "owners delete category owner metadata" on public.category_owners
  for delete using ((select public.is_app_owner()));

--------------------------------------------------------------------------------
-- Notes.
--------------------------------------------------------------------------------

drop policy if exists "members read notes" on public.notes;
create policy "members read notes" on public.notes
  for select using (
    (select public.can_view_workspace_area('notes'))
    and (category_id is null or public.can_access_category(category_id))
  );

drop policy if exists "members create notes" on public.notes;
create policy "members create notes" on public.notes
  for insert with check (
    (select public.can_view_workspace_area('notes'))
    and created_by = (select auth.uid())
    and converted_task_id is null
    and (category_id is null or public.can_access_category(category_id))
  );

drop policy if exists "members update notes" on public.notes;
create policy "members update notes" on public.notes
  for update using (
    (select public.can_view_workspace_area('notes'))
    and (category_id is null or public.can_access_category(category_id))
  )
  with check (
    (select public.can_view_workspace_area('notes'))
    and (category_id is null or public.can_access_category(category_id))
  );

drop policy if exists "members delete notes" on public.notes;
create policy "members delete notes" on public.notes
  for delete using (
    (select public.can_view_workspace_area('notes'))
    and (category_id is null or public.can_access_category(category_id))
  );

drop policy if exists "members read note comments" on public.note_comments;
create policy "members read note comments" on public.note_comments
  for select using (note_id in (select id from public.notes));

drop policy if exists "members create note comments" on public.note_comments;
create policy "members create note comments" on public.note_comments
  for insert with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.notes where notes.id = note_comments.note_id)
  );

drop policy if exists "authors update note comments" on public.note_comments;
create policy "authors update note comments" on public.note_comments
  for update using (
    created_by = (select auth.uid())
    and exists (select 1 from public.notes where notes.id = note_comments.note_id)
  )
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.notes where notes.id = note_comments.note_id)
  );

drop policy if exists "authors delete note comments" on public.note_comments;
create policy "authors delete note comments" on public.note_comments
  for delete using (
    created_by = (select auth.uid())
    and exists (select 1 from public.notes where notes.id = note_comments.note_id)
  );

--------------------------------------------------------------------------------
-- Calendar.
--------------------------------------------------------------------------------

drop policy if exists "calendar_events_select" on public.calendar_events;
create policy "calendar_events_select" on public.calendar_events
  for select to authenticated using (
    (select public.can_view_workspace_area('calendar'))
    and (
      kind = 'away'::public.calendar_event_kind
      or (
        (project_id is null or project_id in (select id from public.projects))
        and (category_id is null or public.can_access_category(category_id))
      )
    )
  );

drop policy if exists "calendar_events_insert" on public.calendar_events;
create policy "calendar_events_insert" on public.calendar_events
  for insert to authenticated with check (
    (select public.can_view_workspace_area('calendar'))
    and created_by = (select auth.uid())
    and (
      kind <> 'away'::public.calendar_event_kind
      or exists (
        select 1 from public.profiles away_profile
        where away_profile.id = calendar_events.profile_id
          and away_profile.onboarding_completed
      )
    )
    and (project_id is null or public.can_edit_project(project_id))
    and (category_id is null or public.can_access_category(category_id))
  );

drop policy if exists "calendar_events_update" on public.calendar_events;
create policy "calendar_events_update" on public.calendar_events
  for update to authenticated using (
    (select public.can_view_workspace_area('calendar'))
    and (
      (select public.is_app_owner())
      or (
        (created_by = (select auth.uid()) or profile_id = (select auth.uid()))
        and (project_id is null or public.can_edit_project(project_id))
        and (category_id is null or public.can_access_category(category_id))
      )
    )
  )
  with check (
    (select public.can_view_workspace_area('calendar'))
    and (
      (select public.is_app_owner())
      or (
        (created_by = (select auth.uid()) or profile_id = (select auth.uid()))
        and (
          kind <> 'away'::public.calendar_event_kind
          or exists (
            select 1 from public.profiles away_profile
            where away_profile.id = calendar_events.profile_id
              and away_profile.onboarding_completed
          )
        )
        and (project_id is null or public.can_edit_project(project_id))
        and (category_id is null or public.can_access_category(category_id))
      )
    )
  );

drop policy if exists "calendar_events_delete" on public.calendar_events;
create policy "calendar_events_delete" on public.calendar_events
  for delete to authenticated using (
    (select public.can_view_workspace_area('calendar'))
    and (
      (select public.is_app_owner())
      or (
        (created_by = (select auth.uid()) or profile_id = (select auth.uid()))
        and (project_id is null or public.can_edit_project(project_id))
        and (category_id is null or public.can_access_category(category_id))
      )
    )
  );

--------------------------------------------------------------------------------
-- Contacts.
--------------------------------------------------------------------------------

drop policy if exists "team manages contacts" on public.contacts;
create policy "team manages contacts" on public.contacts
  for all using ((select public.can_view_workspace_area('contacts')))
  with check (
    (select public.can_view_workspace_area('contacts'))
    and created_by = (select auth.uid())
  );

drop policy if exists "team manages contact people" on public.contact_people;
create policy "team manages contact people" on public.contact_people
  for all using ((select public.can_view_workspace_area('contacts')))
  with check ((select public.can_view_workspace_area('contacts')));

drop policy if exists "team manages contact categories" on public.contact_categories;
create policy "team manages contact categories" on public.contact_categories
  for all using ((select public.can_view_workspace_area('contacts')))
  with check (
    (select public.can_view_workspace_area('contacts'))
    and created_by = (select auth.uid())
  );

drop policy if exists "team manages contact assignments" on public.contact_category_assignments;
create policy "team manages contact assignments" on public.contact_category_assignments
  for all using ((select public.can_view_workspace_area('contacts')))
  with check ((select public.can_view_workspace_area('contacts')));

--------------------------------------------------------------------------------
-- Workspace furniture: statuses, labels, profiles, access groups, audit.
--------------------------------------------------------------------------------

drop policy if exists "team reads statuses" on public.statuses;
create policy "team reads statuses" on public.statuses
  for select using ((select public.is_team_member()));

drop policy if exists "owners manage statuses" on public.statuses;
drop policy if exists "owners insert statuses" on public.statuses;
create policy "owners insert statuses" on public.statuses
  for insert with check ((select public.is_app_owner()));
drop policy if exists "owners update statuses" on public.statuses;
create policy "owners update statuses" on public.statuses
  for update using ((select public.is_app_owner()))
  with check ((select public.is_app_owner()));
drop policy if exists "owners delete statuses" on public.statuses;
create policy "owners delete statuses" on public.statuses
  for delete using ((select public.is_app_owner()));

drop policy if exists "team reads labels" on public.labels;
create policy "team reads labels" on public.labels
  for select using ((select public.is_team_member()));

drop policy if exists "owners manage labels" on public.labels;
drop policy if exists "owners insert labels" on public.labels;
create policy "owners insert labels" on public.labels
  for insert with check ((select public.is_app_owner()));
drop policy if exists "owners update labels" on public.labels;
create policy "owners update labels" on public.labels
  for update using ((select public.is_app_owner()))
  with check ((select public.is_app_owner()));
drop policy if exists "owners delete labels" on public.labels;
create policy "owners delete labels" on public.labels
  for delete using ((select public.is_app_owner()));

drop policy if exists "team reads profiles" on public.profiles;
create policy "team reads profiles" on public.profiles
  for select using ((select public.is_team_member()));

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
  for select using (id = (select auth.uid()));

drop policy if exists "owners update profiles" on public.profiles;
create policy "owners update profiles" on public.profiles
  for update using ((select public.is_app_owner()))
  with check ((select public.is_app_owner()));

drop policy if exists "owners manage access groups" on public.access_groups;
create policy "owners manage access groups" on public.access_groups
  for all using ((select public.is_app_owner()))
  with check (
    (select public.is_app_owner()) and created_by = (select auth.uid())
  );

drop policy if exists "owners manage group members" on public.access_group_members;
create policy "owners manage group members" on public.access_group_members
  for all using ((select public.is_app_owner()))
  with check (
    (select public.is_app_owner()) and added_by = (select auth.uid())
  );

drop policy if exists "owners manage workspace area access" on public.workspace_area_access;
create policy "owners manage workspace area access" on public.workspace_area_access
  for all using ((select public.is_app_owner()))
  with check ((select public.is_app_owner()));

drop policy if exists "owners manage workspace area grants" on public.workspace_area_group_grants;
create policy "owners manage workspace area grants" on public.workspace_area_group_grants
  for all using ((select public.is_app_owner()))
  with check ((select public.is_app_owner()));

drop policy if exists "owners read permission audit" on public.permission_audit_events;
create policy "owners read permission audit" on public.permission_audit_events
  for select using ((select public.is_app_owner()));

drop policy if exists "owners read privileged audit" on public.privileged_audit_events;
create policy "owners read privileged audit" on public.privileged_audit_events
  for select using ((select public.is_app_owner()));

drop policy if exists "Owners read digest runs" on public.digest_runs;
create policy "Owners read digest runs" on public.digest_runs
  for select to authenticated using ((select public.is_app_owner()));

drop policy if exists "Owners read digest settings" on public.digest_settings;
create policy "Owners read digest settings" on public.digest_settings
  for select to authenticated using ((select public.is_app_owner()));
