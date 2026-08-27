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
  and category restrictions, but it never authorizes a request.
- Required authorization lookups fail closed. Missing rows, failed functions,
  or unavailable access metadata deny the operation rather than falling back
  to wider access.
- Project and category visibility mutations must preserve audit records and
  expose pending or error state in the UI.
