# Tasks Access Control Specification

Status: Implemented
Implementation status: Hierarchical tiers plus lateral teams, fail-closed
Last updated: August 9, 2026

## Implemented model

The authorization model separates org-chart seniority from lateral work:

- app owners retain unrestricted workspace access;
- every regular member has exactly one organizational tier;
- higher tiers inherit grants assigned to lower tiers;
- regular members may additionally belong to lateral teams;
- a designated top tier may manage all content without receiving owner-only
  access administration powers;
- each access group may receive viewer, editor, or manager access to projects;
- direct user project grants are no longer supported;
- access-group names, descriptions, memberships, grants, and audit records are
  owner-only metadata and are never exposed to regular members;
- former direct-grant records are retained in a locked legacy table only for
  rollback and do not contribute to effective permissions.

## Security invariants

These invariants are mandatory. A schema migration, policy, helper function,
API route, or rollout procedure must not weaken them:

1. **Centralized grants.** An onboarded regular member receives project access
   from their tier (including inherited lower-tier grants), lateral teams, or a
   deliberately configured global-content tier. Being a project creator, task
   creator, assignee, or a row in legacy metadata never grants access.
2. **No rollout bypass in authorization.** Deployment-readiness checks happen
   when applying the fail-closed migration. RLS and authorization helpers must
   never broaden access because grants, owners, attachment paths, or other
   rollout data are incomplete. Incomplete state must reject the migration or
   deny the request; it must never grant every member manager access.
3. **No project without an initial group grant.** Project creation and its
   initial group grants are one atomic transaction. The database rejects and
   rolls back creation when the creator belongs to no eligible access group or
   no initial group grant can be created. Existing projects must all have a
   reviewed group grant before the fail-closed migration can apply.

## Purpose

The Tasks app needs authorization boundaries for confidential work. Examples
include the Ryan documentary, paid projects, national events, chapter work, and
small volunteer assignments. A user who does not have access to a project must
not be able to discover that project or any data attached to it.

The Tasks app uses this authorization model:

- app owners have unrestricted access to the entire workspace;
- reusable access groups grant project access to stable teams;
- app owners may additionally restrict work categories to selected access groups;
- regular members receive access only through reusable access groups;
- project permissions cascade to tasks and all task-related records;
- Supabase Row Level Security (RLS) is the source of truth.

UI filtering is not considered a security control.

## Goals

- Keep confidential projects invisible to unauthorized users.
- Make recurring access easy to administer through groups.
- Keep all regular-member access explicit through group membership.
- Give app owners complete administrative and content access.
- Support read-only, editing, and project-management permissions.
- Make effective access understandable and auditable.
- Keep the model suitable for approximately 20–30 users without preventing
  future growth.
- Make future authorization changes centralized rather than duplicating access
  logic in every query and policy.

## Non-goals for the first version

- Field-level permissions within a task.
- Separate permissions for individual comments or attachments.
- Temporary grants that expire automatically.
- Public or unauthenticated project sharing.
- Arbitrary group nesting. Tier inheritance is a single ordered ladder.
- Custom permission-role builders.
- Deny rules that override an allow rule.

## Terminology

### App owner

A system-level role with unrestricted read and write access across the app,
including access groups, memberships, project grants, users, and all project
content. This is separate from being a project manager or the creator of a
project.

### Organizational tier and team

An organizational tier is one position on the Ryan Meetup access ladder. Each
person has exactly one tier, and a higher rank inherits every lower tier's
grants. A team is a lateral assignment such as `Documentary Team` or `Chapter
Leads`; a person may belong to several teams when their work crosses functions.

Group names are themselves potentially sensitive. Unauthorized users should
not be able to enumerate every group in the workspace.

### Project grant

A permission assigned to an access group for one project.

### Effective permission

The highest permission a user receives from their group grants for a project.
App owners always receive the highest effective permission.

### Project creator

The user recorded in `projects.created_by`. Creation history does not itself
replace an explicit permission grant. When a non-owner is allowed to create a
project. Creation succeeds only when the database can atomically grant the
creator's groups initial access.

## Roles

### System roles

| Role     | Scope             | Description                                    |
| -------- | ----------------- | ---------------------------------------------- |
| `owner`  | Entire app        | Unrestricted content and administration access |
| `member` | Granted resources | Access only through project grants             |

The system role belongs on `profiles` and should be named `app_role` in code
and the database to avoid confusion with project permissions.

Multiple app owners are supported. The initial migration will promote a
specific existing profile selected during deployment. No email address or user
ID should be hard-coded into the repository.

### Project permissions

Permissions are ordered:

```text
viewer < editor < manager
```

If a user receives multiple grants, the highest permission wins.

| Capability                                 | Viewer | Editor | Manager | App owner |
| ------------------------------------------ | :----: | :----: | :-----: | :-------: |
| Discover and open project                  |  Yes   |  Yes   |   Yes   |    Yes    |
| Read tasks and task details                |  Yes   |  Yes   |   Yes   |    Yes    |
| Create and edit tasks                      |   No   |  Yes   |   Yes   |    Yes    |
| Move tasks within accessible projects      |   No   |  Yes   |   Yes   |    Yes    |
| Comment and upload attachments             |   No   |  Yes   |   Yes   |    Yes    |
| Delete task content                        |   No   |  Yes   |   Yes   |    Yes    |
| Rename or archive the project              |   No   |   No   |   Yes   |    Yes    |
| Manage project group grants                |   No   |   No   |   No    |    Yes    |
| Change an access group's global membership |   No   |   No   |   No    |    Yes    |
| Create, rename, or delete access groups    |   No   |   No   |   No    |    Yes    |
| Change app owners                          |   No   |   No   |   No    |    Yes    |
| Access every project without a grant       |   No   |   No   |   No    |    Yes    |

Deletion can be narrowed later if editors should only delete content they
created. The first version treats editing and deleting project content as the
same permission boundary.

## Recommended organizational setup

Initial groups may include:

- `Core Team`
- `Documentary Team`
- `Chapter Leads`

One-off volunteers receive access through a narrowly scoped access group. The
group may contain one member when an individual exception is required.

`Core Team` must not imply automatic access to every project. Most projects can
grant access to that group, while a sensitive project such as the documentary
can grant access only to `Documentary Team`.

Example:

| Project            | Core Team | Documentary Team | Chapter Leads | Volunteer Team |
| ------------------ | --------- | ---------------- | ------------- | -------------- |
| National meetup    | Editor    | —                | Viewer        | —              |
| Ryan documentary   | —         | Editor           | —             | —              |
| Chapter operations | Viewer    | —                | Editor        | —              |
| Volunteer outreach | Manager   | —                | —             | Editor         |

## Authorization rules

1. An app owner is authorized for every application action.
2. A regular user must belong to a group with an explicit grant for the project.
3. When several grants apply, the highest project permission wins.
4. Grants are additive in version one; there are no explicit deny rules.
5. Only app owners may manage project grants or access-group membership.
6. A user may not assign a task to, move a task into, or reference a project
   they cannot access.
7. A user may not assign a task to a person who cannot access its project.
8. Removing the last source of access takes effect immediately.
9. Archiving a project does not change its access rules.
10. Project creation atomically grants viewer access to every eligible group of
    the creator and fails if no such group grant can be established.
11. Category access never replaces project access. If any access groups are
    assigned to a category, a user must belong to one of those groups to access
    tasks in that category. Tasks in several restricted categories require
    access to every restricted category.

## Projectless tasks

The schema allows `tasks.project_id` to be null. These tasks belong to the
shared workspace and are visible to every onboarded member unless one of their
categories is restricted. Because there is no project grant to confer editor
access, every onboarded member may manage these shared tasks. Project-backed
tasks continue to require their normal project permissions.

## Database model

### Enum types

```sql
create type public.app_role as enum ('owner', 'member');
create type public.project_permission as enum ('viewer', 'editor', 'manager');
```

### Profiles

Add:

```text
profiles.app_role app_role not null default 'member'
```

This restores a system role that was removed by the existing
`flatten_team_permissions` migration, but with deliberately defined owner
semantics.

### Access groups

```text
access_groups
  id uuid primary key
  name text unique, trimmed, non-empty
  description text nullable
  kind access_group_kind (`tier` or `team`)
  hierarchy_rank integer nullable; required and unique for tiers
  grants_global_content boolean; allowed only for tiers
  created_by uuid -> profiles.id
  created_at timestamptz
  updated_at timestamptz
```

### Access-group memberships

```text
access_group_members
  group_id uuid -> access_groups.id on delete cascade
  profile_id uuid -> profiles.id on delete cascade
  added_by uuid -> profiles.id
  created_at timestamptz
  primary key (group_id, profile_id)
```

### Group project grants

```text
project_group_grants
  project_id uuid -> projects.id on delete cascade
  group_id uuid -> access_groups.id on delete cascade
  permission project_permission
  granted_by uuid -> profiles.id
  created_at timestamptz
  updated_at timestamptz
  primary key (project_id, group_id)
```

### Audit events

```text
permission_audit_events
  id uuid primary key
  actor_id uuid -> profiles.id
  action text
  target_type text
  target_id uuid nullable
  before_state jsonb nullable
  after_state jsonb nullable
  created_at timestamptz
```

Audit events should be append-only to application users. App owners may read
them, but no client should be able to update or delete them. Database triggers
are preferred over client-written audit records.

### Existing `project_owners`

The `project_owners` table records display metadata but does not enforce
access. Its rows grant no permission. The table is retained for compatibility
until clients no longer require it, then it can be retired.

The locked `project_user_grants` table likewise contains legacy rollback data
only. Authorization functions and policies must not read it.

## Central authorization functions

RLS policies should call a small set of stable, `security definer` database
functions with a locked search path. Exact signatures may be adjusted during
implementation.

```text
is_team_member() -> boolean
is_app_owner() -> boolean
project_permission_for(project_id uuid) -> project_permission or null
can_view_project(project_id uuid) -> boolean
can_edit_project(project_id uuid) -> boolean
can_manage_project(project_id uuid) -> boolean
can_view_task(task_id uuid) -> boolean
can_edit_task(task_id uuid) -> boolean
```

The permission function should:

1. return `manager` for an app owner or global-content tier;
2. collect direct team grants and tier grants at or below the member's rank;
3. return the highest permission found;
4. return null when no group grant applies.

Indexes are required on every user, group, project, and task foreign key used
by these checks.

## RLS coverage

### Projects and grants

- Only users who can view a project may select it.
- Only project managers and app owners may update project settings.
- Only app owners may hard-delete a project in version one.
- Only app owners may manage project grants.
- Only app owners may create, rename, delete, or change membership in access
  groups.
- Access-group names, memberships, grants, and audit records are owner-only
  metadata.

### Tasks

- Selecting a task requires project view access.
- Inserting, updating, or deleting a task requires project edit access.
- Both the old and new project must be editable when moving a task.
- `created_by` must equal the authenticated user on insert unless the caller is
  an explicitly authorized server workflow.

### Task-related records

Every policy for the following tables must authorize through the parent task:

- `subtasks`
- `task_comments`
- `task_activity`
- `task_attachments`
- `task_assignees`
- `task_labels`
- `task_categories`

Read access requires access to the parent task. Mutating content requires edit
access to the parent task. A join-table record must not leak the existence of a
hidden task.

Global status, category, and label definitions may remain readable to all team
members unless their names themselves become confidential. Their task
relationships remain protected through the parent task.

### Profiles

Team-wide profile visibility is useful for assignment and attribution, but it
must not reveal hidden project or group membership. Profile updates remain
limited to the profile owner, with app-owner access for administrative actions.

### Attachments and Storage

The private `task-attachments` bucket currently allows any team member to read
all objects. Storage policies must instead resolve each object to its task and
apply that task's access rules.

New object paths should begin with the task ID, for example:

```text
{task_id}/{generated_file_id}-{safe_filename}
```

Signed URLs must only be created after authorization. Existing paths need an
inventory and migration plan before the broad team storage policy is removed.

### Realtime

Realtime subscriptions must continue to run as the authenticated user so RLS
filters change events. Clients must re-fetch visible rows after permission
changes and remove records that are no longer returned. No service-role-backed
realtime feed may be exposed to the browser.

## Server/API security

Several current API routes create a Supabase service client after checking only
that the caller is an authenticated team member. A service client bypasses RLS,
so authentication alone is insufficient.

Implementation requirements:

- Prefer the authenticated Supabase client and let RLS enforce authorization.
- When service credentials are genuinely required, authorize the precise
  operation before creating or using the service client.
- Group administration and app-role changes require `is_app_owner()`.
- Project updates require `can_manage_project(project_id)`; grant changes
  additionally require `is_app_owner()`.
- Validate that referenced users and groups exist and are eligible.
- Never trust a role, user ID, group ID, or permission supplied by the browser.
- Return `404` rather than confirming the existence of a hidden project where
  practical.

This audit must include at least the current project, team, status, profile, and
category/work-group routes.

## Owner behavior and safeguards

App owners can:

- access and modify every project and task;
- create, update, and delete access groups;
- add and remove group members;
- create and revoke all project grants;
- promote members to app owner;
- demote other app owners;
- manage users and global workspace configuration;
- read the permission audit log.

Safeguards:

- At least one app owner must always exist.
- The last owner cannot demote or delete themselves.
- Only an existing owner can promote or demote an owner.
- Owner-role changes require explicit confirmation in the UI.
- Group deletion and broad grant removal require confirmation.
- Owner access is still logged; it is not represented as hidden membership in
  every project.
- Database constraints or transactional functions must enforce the last-owner
  rule, not only the UI.

## UI specification

### Owner-only Access settings

Add an Access area containing:

- a list of access groups;
- group name and optional description;
- searchable member selection;
- projects currently granted to each group;
- permission level for each project grant;
- create, rename, and delete actions;
- confirmation for destructive or broad access changes;
- a user list with app-role management;
- a permission audit view.

### Project access settings

App owners can open an Access panel for a project containing:

- group grants;
- the permission attached to each grant;
- each user's effective access and its source, such as
  `Editor through Core Team`;
- warnings when removing a grant will remove a user's final source of access;
- warnings when an existing assignee would lose access;
- owner access shown as `App owner`, without requiring a project grant.

Only app owners may attach or remove groups or alter a group's membership.

### Board and navigation behavior

- The all-projects board includes only tasks returned by RLS.
- Project selectors contain only accessible projects.
- Search, counts, dashboards, and empty states use only accessible tasks.
- Deep links to hidden tasks or projects behave as not found.
- Hidden project names must not appear in breadcrumbs, cached client state,
  notifications, or error messages.
- When access is revoked during a session, the UI removes affected data and
  exits an open hidden task or project view.
- Assignee controls only allow users who can access the selected project.
- Group and grant management must be keyboard-accessible and explain disabled
  actions.

## Notifications, integrations, and derived data

Any current or future feature that copies task data must preserve the source
project's access boundary. This includes:

- email and in-app notifications;
- reminder jobs;
- search indexes;
- analytics and aggregate counts;
- exports;
- calendar feeds;
- webhook payloads;
- backups restored into another environment;
- logs and error-reporting metadata.

Do not send project or task details to a user merely because they were formerly
an assignee. Authorization must be checked when a notification is generated or
delivered.

## Migration strategy

The migration should avoid briefly exposing or hiding existing production
work unexpectedly.

1. Inventory current users, projects, project owners, projectless tasks, and
   attachment paths.
2. Confirm the initial owner profile through deployment configuration or a
   reviewed migration parameter.
3. Add new enum types, tables, constraints, indexes, helper functions, and
   audit triggers without changing existing read behavior.
4. Promote the selected initial app owner.
5. Create initial access groups and memberships from an explicitly reviewed
   mapping.
6. Treat `project_owners` as non-authoritative compatibility metadata; do not
   convert it into effective access.
7. Add group grants for every existing project. Do not infer confidential
   membership from task assignment alone.
8. Create `General / Shared`, grant its intended groups, and migrate projectless
   tasks into it.
9. Update task attachment paths or establish a secure lookup for legacy paths.
10. Replace broad RLS policies with centralized authorization policies in one
    reviewed, fail-closed migration. The migration must reject incomplete
    rollout data instead of exposing a runtime bypass.
11. Update server routes so service-role access cannot bypass authorization.
12. Update initial page queries, realtime refreshes, client state, and UI.
13. Verify access using multiple real test accounts before enabling management
    controls in production.
14. Make `tasks.project_id` non-null after data verification.
15. Remove the obsolete `project_owners` table and legacy policies only after
    successful validation.

Existing projects should not all be made team-visible automatically. Each
project should receive an explicit, reviewed grant set during migration.

## Testing and acceptance criteria

At minimum, automated tests should cover an app owner, project manager, editor,
viewer, unrelated member, and user who receives overlapping grants.

### Required security cases

- An unrelated member cannot select a restricted project by ID.
- An unrelated member cannot select any task or child record from that project.
- An unrelated member cannot obtain or reuse a newly issued attachment URL.
- An unrelated member cannot infer hidden records from joins, counts, search,
  filters, errors, or realtime events.
- A viewer can read but cannot mutate project content.
- An editor can manage content but cannot change project access.
- A manager can manage project grants but cannot modify global group
  membership or app roles.
- An app owner can perform every supported action.
- A user with viewer and editor grants receives editor access.
- Revoking the final applicable grant removes access immediately.
- Removing one overlapping grant preserves access supplied by another grant.
- A task cannot be moved to a project the actor cannot edit.
- An inaccessible user cannot be assigned to a restricted task.
- The last app owner cannot be demoted or deleted.
- Direct database requests and API requests enforce the same permissions.
- A regular member with no applicable group grant receives no project access,
  including while rollout data is incomplete.
- No authorization helper or RLS policy contains a rollout/readiness fallback.
- Creating a project for a creator with no eligible group is rejected and
  leaves no project row behind.

### Required UI cases

- Boards, project menus, task counts, search, and activity omit hidden data.
- Effective-permission sources are shown accurately.
- Revocation during an active session clears inaccessible client state.
- Permission controls are usable by keyboard and expose clear labels and
  validation errors.
- Loading and error states do not reveal hidden resource names.

## Deployment and rollback

- Apply schema additions before deploying code that reads them.
- Test the final RLS migration in a staging Supabase project populated with
  production-shaped data.
- Take a database backup before replacing policies or migrating attachment
  paths.
- Keep the old ownership data until new grants have been validated.
- Rollback must restore the previous policies and application version together;
  rolling back only one side could expose data or lock out users.
- After release, review audit events and denied-request logs for unexpected
  access failures without logging sensitive record contents.

## Implemented decisions

- Use reusable groups as the only project-grant mechanism for regular members.
- Represent individual exceptions with narrowly scoped groups.
- Support `viewer`, `editor`, and `manager` project permissions.
- Add a global `owner` system role.
- App owners have unrestricted application access.
- Only app owners can modify groups, group membership, and app roles.
- Project access cascades to all tasks and related records.
- App owners may manage all permissions in the app UI.
- Support multiple app owners, with protection against removing the last one.
- RLS, not client filtering, is the enforcement boundary.
- New projects atomically grant viewer access to every eligible access group
  the creator belongs to; creation fails when no initial grant can be created.
- Authorization is always fail-closed. Rollout readiness never changes a
  request-time permission result.

## Open decisions for review

These product decisions remain open:

1. **Editor deletion:** may editors delete tasks and attachments, or only create
   and edit them? Recommendation: allow deletion initially and rely on audit and
   confirmation behavior.
2. **Comments for viewers:** strictly read-only, or may viewers comment?
   Recommendation: strictly read-only; grant editor when participation is
   expected.
3. **Initial groups and memberships:** exact users for Core Team, Documentary
   Team, and Chapter Leads must be reviewed before migration.
4. **Existing project grants:** every existing project needs an explicit access
   mapping before restrictive RLS is enabled.
5. **General / Shared access:** decide which groups should see tasks currently
   lacking a project.
6. **Owner user management:** determine whether owners may deactivate accounts
   in version one or only change application roles.
7. **Hard deletion:** decide whether the first version should support permanent
   deletion of projects/groups or archive them only. Recommendation: archive
   projects; allow group deletion only when it has no active grants.

## Implementation phases

The phases below describe the implemented rollout sequence and remaining
validation work.

### Phase 1: Authorization foundation

- Schema, enums, indexes, grants, audit tables, and helper functions
- Initial owner and reviewed access mappings
- RLS and Storage policies
- Security-focused database tests

### Phase 2: Server integration

- Harden service-role routes
- Add typed authorization-aware data access
- Update attachment signing and realtime refresh behavior
- Add API tests for every permission level

### Phase 3: Management UI

- Owner Access settings
- Group and membership management
- Project grant management
- Effective-access explanations and safeguards

### Phase 4: Board integration and validation

- Authorization-aware project selectors, assignments, search, and counts
- Revocation handling and client-state cleanup
- Cross-account end-to-end tests
- Staged migration, security review, and production rollout
