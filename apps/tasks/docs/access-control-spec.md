# Access control specification

This document defines the Tasks authorization model. Supabase row-level
security and the canonical database functions enforce these rules; UI filters
and access previews only explain or simulate them.

## Workspace authority

- App owners and organizational tiers with workspace-wide content access have
  manager access to every current and future project and category.
- Every onboarded member belongs to one organizational tier and may also belong
  to lateral teams.
- Higher organizational tiers inherit the selected-project and category grants
  of lower tiers. Teams do not inherit from other teams.
- Group membership and category visibility are app-owner administrative data.
  Project visibility is available to app owners and that project's named
  owners. Every visibility change must be audited.

## Projects

Each project has one visibility mode:

- `owners`: only named project owners and workspace-wide managers can access it;
- `open`: every onboarded workspace member can collaborate on it;
- `restricted`: members of one or more selected access groups can collaborate
  on it.

Named project owners receive manager access directly, independently of their
group membership. Collaborators can view the project and create or edit its
tasks and attachments. They cannot change project details, owners, visibility,
archive state, or deletion state. New projects default to `owners` and require
at least one named owner.

Project creation writes the project, its named owners, visibility mode, and any
selected groups in one transaction. Changing visibility replaces the complete
selected-group set atomically. A failed or incomplete write must never broaden
visibility.

## Categories

Categories are open by default. An open category is available to every member;
a restricted category is available only through its selected access groups and
workspace-wide management authority. A restricted category with no selected
groups is therefore workspace-manager-only.

Category ownership is descriptive metadata. Category creation, editing, and
visibility remain limited to members with workspace-wide content management.

## Pages

Notes, Contacts, and the Calendar can each be locked as a whole. The set of
lockable pages is owned by the application registry in
`lib/access/workspace-areas.ts`, not by the database; `workspace_area_access`
holds a row only for a page an app owner has configured.

- A page with no row is open to every onboarded member.
- A restricted page is available only through its selected access groups and
  workspace-wide content authority. A restricted page with no selected groups
  is therefore workspace-manager-only.
- Setting a page's mode replaces its complete selected-group set atomically. A
  failed or incomplete write must never broaden access.
- Page access is checked before every other check on that page's content, and
  it gates the whole surface: the rows, the route, the sidebar entry, the API
  boundary, and the page's resource activity.
- Which groups reach a page is owner-only administrative data. Members never
  read `workspace_area_access` or `workspace_area_group_grants`; they ask
  `accessible_workspace_areas`, which answers about themselves only. Every
  change must be audited.
- `access_groups.calendar_access` remains a sub-permission of the Calendar
  page: it decides whether the synced Google feed renders for a member who can
  already open the page, never whether the page opens.
- Contact images live in a public storage bucket, so an existing image URL
  stays reachable regardless of page access; what page access decides for that
  bucket is who may add, replace, or remove an image.

## Tasks and related content

- A project task is visible only when the member can access its project and
  every category assigned to the task.
- Editing a task requires collaborator access to its project and access to all
  assigned categories.
- Projectless tasks remain available to onboarded workspace members, subject to
  their category restrictions.
- Task comments, subtasks, labels, activity, attachments, calendar entries, and
  other related rows must use the same canonical task/project/category checks.
- Assignees must be eligible for the task's project. Named project owners,
  members of selected groups, members with workspace-wide access, and all
  onboarded members of an open project are eligible.

## Diagnostics and failure behavior

- Access preview is an owner-only diagnostic projection. It must include open
  projects, named project ownership, group inheritance, workspace-wide access,
  category restrictions, and page restrictions, but it never authorizes a
  request. Previewing a subject who cannot open a page answers the way that
  subject's own request would.
- Required authorization lookups fail closed. Missing rows, failed functions,
  or unavailable access metadata deny the operation rather than falling back
  to wider access.
- Project, category, and page visibility mutations must preserve audit records
  and expose pending or error state in the UI.
- The one tolerated absence is a migration that has not been applied yet: with
  no `accessible_workspace_areas` function and no policy referencing it, no
  page is restricted, so treating every page as open reports the database's
  actual state rather than widening it. Any other failure of an area lookup
  denies.
