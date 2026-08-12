begin;

create extension if not exists pgtap with schema extensions;
set local role postgres;
grant usage on schema extensions to authenticated;
-- Local migrations do not reproduce the dashboard-managed API table grants.
-- Grant only the relations exercised here so RLS, rather than ACL setup, is
-- the boundary under test.
grant select, insert, update, delete on public.projects, public.tasks, public.project_owners to authenticated;
grant select on public.statuses to authenticated;
grant insert on public.access_group_members to authenticated;
set local search_path = public, extensions;
select extensions.plan(47);

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'owner@test.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'viewer@test.invalid'),
  ('10000000-0000-4000-8000-000000000003', 'editor@test.invalid'),
  ('10000000-0000-4000-8000-000000000004', 'manager@test.invalid'),
  ('10000000-0000-4000-8000-000000000005', 'unonboarded@test.invalid'),
  ('10000000-0000-4000-8000-000000000006', 'zero-group@test.invalid'),
  ('10000000-0000-4000-8000-000000000007', 'zero-group-owner@test.invalid');

update public.profiles
set onboarding_completed = true
where id <> '10000000-0000-4000-8000-000000000005';
alter table public.profiles disable trigger profiles_protect_owner_role;
update public.profiles
set app_role = 'owner'
where id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000007'
);
alter table public.profiles enable trigger profiles_protect_owner_role;

-- The new-user trigger may add test profiles to the live/default Members group.
-- Remove that implicit fixture state so each permission below is isolated.
select set_config('app.replacing_access_tier', 'true', true);
delete from public.access_group_members
where profile_id between
  '10000000-0000-4000-8000-000000000001'
  and '10000000-0000-4000-8000-000000000007';
select set_config('app.replacing_access_tier', 'false', true);

insert into public.access_groups (id, name, created_by) values
  ('20000000-0000-4000-8000-000000000001', 'Auth test viewer', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', 'Auth test editor', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000003', 'Auth test manager', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000004', 'Auth test other project', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000005', 'Auth test unonboarded', '10000000-0000-4000-8000-000000000001');

insert into public.access_group_members (group_id, profile_id, added_by) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001');

alter table public.projects disable trigger projects_grant_creator_groups;
insert into public.projects (id, name, created_by) values
  ('30000000-0000-4000-8000-000000000001', 'Auth test granted project', '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002', 'Auth test other project', '10000000-0000-4000-8000-000000000001');
alter table public.projects enable trigger projects_grant_creator_groups;

insert into public.project_group_grants (project_id, group_id, permission, granted_by) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'viewer', '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'editor', '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'manager', '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004', 'manager', '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005', 'manager', '10000000-0000-4000-8000-000000000001');

insert into public.project_owners (project_id, profile_id) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001');

insert into public.tasks (id, title, status_id, created_by, reported_by, project_id)
select '40000000-0000-4000-8000-000000000001', 'Auth test other task', id,
  '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002'
from public.statuses order by sort_order limit 1;

insert into public.tasks (id, title, status_id, created_by, reported_by, project_id)
select '40000000-0000-4000-8000-000000000002', 'Auth test shared task', id,
  '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', null
from public.statuses order by sort_order limit 1;

set local role authenticated;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$insert into public.tasks (title, status_id, created_by, reported_by, project_id, assignee_id)
    select 'Auth test owner-created shared task', id,
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001', null,
      '10000000-0000-4000-8000-000000000001'
    from public.statuses order by sort_order limit 1
    returning id$$,
  'app owner can create, return, and self-assign a shared projectless task'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(public.project_permission_for('30000000-0000-4000-8000-000000000001'), 'viewer'::public.project_permission, 'viewer receives only the explicit viewer permission');
select is(public.project_permission_for('30000000-0000-4000-8000-000000000002'), null::public.project_permission, 'viewer is denied across projects');
select is((select count(*) from public.projects where id = '30000000-0000-4000-8000-000000000002'), 0::bigint, 'project RLS denies the viewer cross-project reads');
select is((select count(*) from public.tasks where id = '40000000-0000-4000-8000-000000000001'), 0::bigint, 'task RLS denies the viewer cross-project reads');
select is((select count(*) from public.project_owners where project_id = '30000000-0000-4000-8000-000000000001'), 1::bigint, 'viewer can read owner metadata for an accessible project');
select is((select count(*) from public.project_owners where project_id = '30000000-0000-4000-8000-000000000002'), 0::bigint, 'viewer cannot read owner metadata across projects');
select throws_ok(
  $$insert into public.project_owners (project_id, profile_id) values ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002')$$,
  '42501',
  'new row violates row-level security policy for table "project_owners"',
  'viewer cannot add owner metadata to an inaccessible project'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is(public.project_permission_for('30000000-0000-4000-8000-000000000001'), 'editor'::public.project_permission, 'editor receives only the explicit editor permission');
select is(public.project_permission_for('30000000-0000-4000-8000-000000000002'), null::public.project_permission, 'editor is denied across projects');
select is((select count(*) from public.projects where id = '30000000-0000-4000-8000-000000000002'), 0::bigint, 'project RLS denies the editor cross-project reads');
select is((select count(*) from public.tasks where id = '40000000-0000-4000-8000-000000000001'), 0::bigint, 'task RLS denies the editor cross-project reads');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select is(public.project_permission_for('30000000-0000-4000-8000-000000000001'), 'manager'::public.project_permission, 'manager receives only the explicit manager permission');
select is(public.project_permission_for('30000000-0000-4000-8000-000000000002'), null::public.project_permission, 'manager is denied across projects');
select is((select count(*) from public.projects where id = '30000000-0000-4000-8000-000000000002'), 0::bigint, 'project RLS denies the manager cross-project reads');
select is((select count(*) from public.tasks where id = '40000000-0000-4000-8000-000000000001'), 0::bigint, 'task RLS denies the manager cross-project reads');
select is((select count(*) from public.project_owners where project_id = '30000000-0000-4000-8000-000000000002'), 0::bigint, 'manager cannot read owner metadata across projects');
select throws_ok(
  $$insert into public.project_owners (project_id, profile_id) values ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004')$$,
  '42501',
  'new row violates row-level security policy for table "project_owners"',
  'manager cannot add owner metadata across projects'
);
select lives_ok(
  $$insert into public.project_owners (project_id, profile_id) values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003')$$,
  'manager can add eligible owner metadata to a managed project'
);
select throws_ok(
  $$insert into public.project_owners (project_id, profile_id) values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006')$$,
  '42501',
  'new row violates row-level security policy for table "project_owners"',
  'manager cannot add an ineligible profile as project owner metadata'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select is(public.is_team_member(), false, 'unonboarded profile is not an active team member');
select is(public.project_permission_for('30000000-0000-4000-8000-000000000002'), null::public.project_permission, 'unonboarded user is denied despite a group grant');
select is((select count(*) from public.projects where id = '30000000-0000-4000-8000-000000000002'), 0::bigint, 'project RLS denies the unonboarded user');
select is((select count(*) from public.tasks where id = '40000000-0000-4000-8000-000000000001'), 0::bigint, 'task RLS denies the unonboarded user');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000099', true);
select is(public.is_team_member(), false, 'removed user without a profile is not a team member');
select is(public.project_permission_for('30000000-0000-4000-8000-000000000002'), null::public.project_permission, 'removed user has no project permission');
select is((select count(*) from public.projects where id = '30000000-0000-4000-8000-000000000002'), 0::bigint, 'project RLS denies the removed user');
select is((select count(*) from public.tasks where id = '40000000-0000-4000-8000-000000000001'), 0::bigint, 'task RLS denies the removed user');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);
select is(public.is_team_member(), true, 'onboarded zero-group profile remains an active team member');
select is(public.project_permission_for('30000000-0000-4000-8000-000000000001'), null::public.project_permission, 'zero-group user has no implicit project permission');
select is((select count(*) from public.projects where id = '30000000-0000-4000-8000-000000000001'), 0::bigint, 'project RLS denies the zero-group user');
select is((select count(*) from public.tasks where id = '40000000-0000-4000-8000-000000000001'), 0::bigint, 'task RLS denies the zero-group user');
select is((select count(*) from public.project_owners), 0::bigint, 'zero-group user cannot enumerate project owner metadata');
select is(public.can_edit_task('40000000-0000-4000-8000-000000000002'), true, 'onboarded members can edit a shared projectless task');
select is(public.can_assign_to_project('10000000-0000-4000-8000-000000000006', null), true, 'onboarded members can be assigned to a shared projectless task');
select lives_ok(
  $$update public.tasks set assignee_id = '10000000-0000-4000-8000-000000000006' where id = '40000000-0000-4000-8000-000000000002'$$,
  'onboarded members can save an assignee on a shared projectless task'
);
select lives_ok(
  $$update public.tasks set board_position = 2048 where id = '40000000-0000-4000-8000-000000000002'$$,
  'onboarded members can move a shared projectless task'
);
select is(
  (select board_position from public.tasks where id = '40000000-0000-4000-8000-000000000002'),
  2048::double precision,
  'the shared task move is persisted'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000007', true);
select throws_ok(
  $$insert into public.projects (name, created_by) values ('Auth test rejected zero-group project', '10000000-0000-4000-8000-000000000007')$$,
  '23514',
  'A project creator must belong to at least one access group',
  'project creation rejects a creator for whom no initial group grant can be established'
);
select is((select count(*) from public.projects where name = 'Auth test rejected zero-group project'), 0::bigint, 'rejected project creation is atomic');
select lives_ok(
  $$insert into public.project_owners (project_id, profile_id) values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000007')$$,
  'app owner can add an eligible app owner to project owner metadata'
);

set local role postgres;
insert into public.access_groups (
  id, name, created_by, kind, hierarchy_rank, grants_global_content
) values
  ('20000000-0000-4000-8000-000000000011', 'Auth test lower tier', '10000000-0000-4000-8000-000000000001', 'tier', 910, false),
  ('20000000-0000-4000-8000-000000000012', 'Auth test higher tier', '10000000-0000-4000-8000-000000000001', 'tier', 920, false),
  ('20000000-0000-4000-8000-000000000013', 'Auth test global tier', '10000000-0000-4000-8000-000000000001', 'tier', 930, true);
insert into public.access_group_members (group_id, profile_id, added_by) values
  ('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001');
insert into public.project_group_grants (project_id, group_id, permission, granted_by)
values ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000011', 'viewer', '10000000-0000-4000-8000-000000000001');

set local role authenticated;
select ok(has_sequence_privilege('authenticated', 'public.task_number_seq', 'USAGE'), 'authenticated users can allocate task numbers');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select ok(public.member_has_group_access('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000011'), 'higher tiers inherit lower-tier grants');
select is(public.member_has_group_access('10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000012'), false, 'lower tiers do not inherit higher-tier grants');
select is(public.project_permission_for('30000000-0000-4000-8000-000000000002'), 'viewer'::public.project_permission, 'an inherited lower-tier project grant becomes effective');
select throws_ok(
  $$insert into public.access_group_members (group_id, profile_id, added_by) values ('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001')$$,
  '23505',
  'A profile may belong to only one organizational tier',
  'a profile cannot accumulate multiple organizational tiers'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is(public.project_permission_for('30000000-0000-4000-8000-000000000002'), 'manager'::public.project_permission, 'a global-content tier manages every project without an explicit grant');

select * from finish();
rollback;
