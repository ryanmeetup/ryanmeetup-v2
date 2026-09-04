---
version: "0.7"
slug: v7-faster-follow-through
author: Ryan Le
date: "2026-09-04"
dateLabel: August 28 – September 4, 2026
title: Transactional writes, multiple assignees, and read-only MCP access
summary: Resource changes and their history now succeed or fail together in one Postgres transaction, tasks can hold a crew instead of one name, whole pages can be locked to access groups, and a trusted assistant can read the workspace without touching it.
overview:
  - Every resource change and its activity row in one transaction
  - Multiple assignees per task, backed by the join table rather than a column
  - Statuses that require a written reason before work enters them
  - Notes, Contacts, and Calendar lockable to selected access groups
  - Read-only MCP access for Claude Desktop
  - Server-written comments, attachments, and activity without a refresh
  - Full-page editors on phones, and multiple contact methods per person
  - CI gated on types, unit coverage, and end-to-end tests
---

## New

### Duplicate the work, not the setup

Existing tasks can be duplicated from either the board editor or the task page. The new task carries the original fields into a fresh draft, ready to adjust before saving, while the original stays untouched.

### Paste a checklist all at once

Paste a plain-text or Markdown list into the checklist field and Tasks turns every line into its own item in one save. Bullets, numbering, and task boxes are cleaned up automatically, and checked task boxes stay checked. The whole paste writes one summary activity row rather than one row per line.

### Status changes with their reason attached

Owners can mark a status as requiring an explanation. Moving a task into one of those statuses asks why and writes the answer as a task comment in the same transaction as the status change, so the decision and its context cannot drift apart. **Will Not Do** starts with this requirement, and new statuses can be created directly from the Statuses page header.

### Read-only access for trusted assistants

Deployments configured for it can offer a read-only MCP connection for Claude Desktop. A trusted assistant can inspect tasks, projects, categories, notes, contacts, calendars, activity, and workspace metrics with no ability to create, edit, delete, or upload anything.

### Lock a whole page to the people who need it

Notes, Contacts, and the Calendar can each be restricted to selected access groups from **Admin → Access → Page access**. A restricted page disappears from the sidebar for everyone who cannot open it, and its content — notes and their comments, the contact directory, calendar events and the synced Google feed — is refused at the database, not merely hidden. Pages stay open to everyone until an owner restricts them, and app owners and tiers with workspace-wide content access always keep every page.

## Improved

### Big editors get room to breathe on phones

Creating or editing a task, project, category, contact, or calendar event uses a full mobile page with reachable actions and returns you to the exact filtered view you came from. Contacts use their dedicated pages on desktop too, while the other editors keep their familiar desktop dialogs.

### Contact links you can read

Editing a contact now happens at an address that names it — `/contacts/the-lantern-room/edit` — with nothing else appended. Older links built from the contact's id keep working, and two contacts sharing a display name keep theirs. Leaving the editor returns you to the directory exactly as you left it, search and scroll position included.

### Tasks can have a crew

Assign a task to several teammates without replacing the people already on it. My Tasks, dashboard counts, search, and weekday digests all recognize shared assignments.

### Every way to reach someone

Each person on a contact can have multiple email addresses and phone numbers, with labels such as Personal, Work cell, or Office. The person editor groups those details into compact lists with clear counts and quick add and remove controls. Every saved method stays searchable and appears as its own email or call link in the contact directory.

### Task cards with less label clutter

Task cards keep each category together as one colored badge without piling on its selected tags. Hovering a category reveals those tags, and the task page shows their names beneath the category they refine, so the detail stays available without turning every categorization into another competing badge.

### Changes appear while they are still fresh

Comments, checklist updates, attachments, and activity written by the server appear as soon as the save finishes instead of waiting for a refresh. Project and category attachment changes refresh across open views and connected teammates.

Changing task filters, searches, sorting, pages, or views while results load keeps the newest request, so a slower earlier response cannot replace the choice you just made.

### Activity tells the fuller story

Activity now covers access groups, visibility grants, teammates, statuses, digest settings and runs, workspace identity and banner changes, Google Calendar connections, and email administration. Task updates show field-level changes, and status explanations appear alongside the change that prompted them.

### Safer files and richer text

Contact image uploads save together with their contact, and replacing, removing, or deleting an uploaded image also cleans up the old file in storage. Rich-text fields preserve intentional spacing and show Markdown headings while editing. Modals require a deliberate close action, protecting longer edits from an accidental backdrop click. Saved drafts keep their checklist, linked attachments, and opening comment.

### One identity across the workspace

A workspace uses one instance name for page titles, digest emails, link previews, the sidebar wordmark, and the footer. Owners write the workspace notice under **Banner** in Settings, including an optional link and label. Updating the message brings the banner back for teammates who dismissed an older notice, while an untouched setting continues to use the deployment default.

### A calmer canvas

The workspace sits on a subtle paper texture with solid task columns that stay readable over it. The board fills the space above the footer, keeping its horizontal scroller against the bottom edge, and the latest-release card starts collapsed on smaller screens.

Projects lead with active work, follow their lifecycle order, and default to Discovery. Project and category visibility controls stay with their own editors instead of appearing as a second set of controls on the Access page.

## Under the hood

### Writes that cannot half-finish

Categories, projects, contacts, calendar dates, notes, comments, and resource attachments now write their change and their activity history inside one Postgres function. If either fails, neither is left behind. Where the shape allowed it, the history moved onto database triggers so it is recorded by the database rather than by whichever code path remembered to — the gap that had been open since v0.4.

### Named validation errors

The resource mutations used to raise `23514` for their own validation failures, which is the same SQLSTATE Postgres raises for a real check constraint. The API could not tell "you picked an owner who has not finished onboarding" apart from a constraint violation, so it answered both with a banner that named nothing. Those raises now carry `RS001`, and the API returns their message verbatim.

### Assignees moved to the relation

`task_assignees` had existed since the baseline schema but only ever mirrored `tasks.assignee_id`. The join table is now the source of truth — it already carries the row-level policy for who may be assigned in a project, and it is already published to realtime. The old column is kept synchronized to one deterministic assignee so a rollback can still read the task.

### Indexes for the Activity page

Every Activity page load ordered the audit table by timestamp under a JSONB containment predicate, with no index for it — a full scan and a sort on every visit. Two indexes now cover it.

### CI that can say no

Continuous integration runs typechecking, unit tests with a coverage floor, and the Playwright end-to-end suite covering the critical workspace workflows. The production build still runs the database contract check first.

## Still in beta

Page access covers Notes, Contacts, and the Calendar. The board, projects, and categories still depend on project and category visibility, so there is no single place to answer what one teammate can reach.

The editors are split between full mobile pages and desktop dialogs, which means the same form exists as two layouts that have to stay in step. The read-only MCP connection is available only on deployments configured for it, and it stays read-only — an assistant can answer questions about the workspace but cannot act in it.
