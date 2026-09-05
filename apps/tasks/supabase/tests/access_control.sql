begin;

create extension if not exists pgtap with schema extensions;
select plan(27);

select ok(
  not has_function_privilege('anon', 'public.beginner_flow_health()', 'execute'),
  'anonymous callers cannot inspect workspace health'
);
select ok(
  not has_function_privilege('anon', 'public.repair_beginner_flow()', 'execute'),
  'anonymous callers cannot repair workspace provisioning'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.provision_workspace_member(uuid,text,text)',
    'execute'
  ),
  'anonymous callers cannot provision members'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.record_privileged_audit_event(uuid,text,text,uuid,jsonb)',
    'execute'
  ),
  'anonymous callers cannot forge privileged audit events'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.consume_privileged_rate_limit(text,integer,integer)',
    'execute'
  ),
  'ordinary users cannot consume or manipulate privileged rate limits'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.can_administer_project_access(uuid)',
    'execute'
  ),
  'anonymous callers cannot probe project access administration'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-4000-8000-000000000001', 'owner@example.test', '{"full_name":"Owner"}'),
  ('00000000-0000-4000-8000-000000000002', 'named@example.test', '{"full_name":"Named owner"}'),
  ('00000000-0000-4000-8000-000000000003', 'manager@example.test', '{"full_name":"Global manager"}'),
  ('00000000-0000-4000-8000-000000000004', 'member@example.test', '{"full_name":"Member"}');

update public.profiles set onboarding_completed = true;
update public.profiles
set app_role = 'owner'
where id = '00000000-0000-4000-8000-000000000001';

insert into public.access_groups (
  id, name, created_by, kind, hierarchy_rank, grants_global_content
) values (
  '10000000-0000-4000-8000-000000000001',
  'Workspace managers',
  '00000000-0000-4000-8000-000000000001',
  'tier',
  100,
  true
);
insert into public.access_groups (
  id, name, created_by, kind, hierarchy_rank
) values (
  '10000000-0000-4000-8000-000000000002',
  'Senior members',
  '00000000-0000-4000-8000-000000000001',
  'tier',
  50
);
insert into public.access_groups (id, name, created_by, kind)
values (
  '10000000-0000-4000-8000-000000000003',
  'Events team',
  '00000000-0000-4000-8000-000000000001',
  'team'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000001',
  true
);
select public.set_profile_access_tier(
  '00000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001'
);
reset role;

insert into public.projects (
  id, name, created_by, access_mode
) values (
  '20000000-0000-4000-8000-000000000001',
  'Restricted launch',
  '00000000-0000-4000-8000-000000000001',
  'owners'
);
insert into public.project_owners (project_id, profile_id)
values (
  '20000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002'
);
insert into public.workspace_area_access (
  area, access_mode, updated_by
) values (
  'notes', 'restricted', '00000000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000001',
  true
);
select ok(
  public.can_administer_project_access(
    '20000000-0000-4000-8000-000000000001'
  ),
  'app owners can administer project visibility'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000002',
  true
);
select ok(
  public.can_administer_project_access(
    '20000000-0000-4000-8000-000000000001'
  ),
  'named project owners can administer project visibility'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000003',
  true
);
select ok(
  not public.can_administer_project_access(
    '20000000-0000-4000-8000-000000000001'
  ),
  'workspace-wide content managers do not inherit access administration'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000004',
  true
);
select ok(
  not public.can_administer_project_access(
    '20000000-0000-4000-8000-000000000001'
  ),
  'ordinary members cannot administer project visibility'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000001',
  true
);
select ok(
  public.can_view_workspace_area('notes'),
  'app owners bypass page restrictions'
);
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000003',
  true
);
select ok(
  not public.can_view_workspace_area('notes'),
  'workspace-wide content access does not bypass page restrictions'
);
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000004',
  true
);
select ok(
  not public.can_view_workspace_area('notes'),
  'ordinary members without a selected group cannot open a restricted page'
);
reset role;
insert into public.workspace_area_group_grants (area, group_id, granted_by)
values (
  'notes',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000003',
  true
);
select ok(
  public.can_view_workspace_area('notes'),
  'a workspace-wide tier reaches a restricted page when selected explicitly'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000003',
  true
);
select throws_ok(
  $$select public.set_project_visibility(
    '20000000-0000-4000-8000-000000000001', 'open', '{}'::uuid[]
  )$$,
  'P0002',
  'Project not found',
  'workspace-wide managers cannot call the visibility workflow'
);
select throws_ok(
  $$update public.projects
    set access_mode = 'open'
    where id = '20000000-0000-4000-8000-000000000001'$$,
  '42501',
  'Project visibility must be changed through set_project_visibility',
  'direct table updates cannot bypass the visibility workflow'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000002',
  true
);
select lives_ok(
  $$select public.set_project_visibility(
    '20000000-0000-4000-8000-000000000001', 'open', '{}'::uuid[]
  )$$,
  'a named owner can use the visibility workflow'
);
select is(
  (select access_mode from public.projects
    where id = '20000000-0000-4000-8000-000000000001'),
  'open',
  'the canonical visibility workflow updates the mode'
);
reset role;
select is(
  (select count(*)::integer from public.permission_audit_events
    where action = 'project.visibility.update'
      and target_id = '20000000-0000-4000-8000-000000000001'),
  1,
  'the visibility change is audited in the same transaction'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000001',
  true
);
select lives_ok(
  $$select public.replace_profile_access(
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    array['10000000-0000-4000-8000-000000000003']::uuid[],
    'owner'
  )$$,
  'an owner can atomically promote a successor and replace group access'
);
select is(
  (select app_role::text from public.profiles
    where id = '00000000-0000-4000-8000-000000000002'),
  'owner',
  'the successor receives the app-owner role'
);
select is(
  (select count(*)::integer from public.access_group_members
    where profile_id = '00000000-0000-4000-8000-000000000002'),
  2,
  'the successor has exactly one tier and the selected team'
);
select lives_ok(
  $$select public.replace_profile_access(
    '00000000-0000-4000-8000-000000000001',
    (select id from public.access_groups where is_default),
    '{}'::uuid[],
    'member'
  )$$,
  'an owner can demote themselves after promoting a successor'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000002',
  true
);
select throws_ok(
  $$select public.replace_profile_access(
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '{}'::uuid[],
    'member'
  )$$,
  'AO001',
  'Promote another app owner before removing or demoting the last owner',
  'the last owner cannot be demoted'
);
select is(
  (select app_role::text from public.profiles
    where id = '00000000-0000-4000-8000-000000000002'),
  'owner',
  'a rejected last-owner demotion rolls back'
);
select lives_ok(
  $$select public.set_default_access_tier(
    '10000000-0000-4000-8000-000000000002'
  )$$,
  'an owner can change the new-member default tier'
);
select is(
  (select id::text from public.access_groups where is_default),
  '10000000-0000-4000-8000-000000000002',
  'exactly the selected tier is the new-member default'
);

select * from finish();
rollback;
