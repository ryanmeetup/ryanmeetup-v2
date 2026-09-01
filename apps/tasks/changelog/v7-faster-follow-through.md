---
version: 7
slug: v7-faster-follow-through
author: Ryan Le
date: "2026-09-01"
dateLabel: September 1, 2026
title: Faster follow-through, clearer history, and a workspace that feels like yours
summary: Tasks move faster with duplication and pasted checklists, important status changes carry their context, and the workspace gains clearer activity, safer saves, and an identity of its own.
overview:
  - Duplicate an existing task from its editor or task page
  - Paste a whole list into a checklist in one step
  - Require an explanation when work enters selected statuses
  - See server-written comments, attachments, and activity without refreshing
  - Give each workspace one name and write its notice banner
  - Give configured deployments read-only MCP access for trusted assistants
---

## New

### Duplicate the work, not the setup

Existing tasks can now be duplicated from either the board editor or the task page. The new task carries the original fields into a fresh draft, ready to adjust before saving, while the original stays untouched.

### Paste a checklist all at once

Paste a plain-text or Markdown list into the checklist field and Tasks turns every line into its own item in one save. Bullets, numbering, and task boxes are cleaned up automatically, and checked task boxes stay checked.

### Status changes with their reason attached

Owners can mark a status as requiring an explanation. Moving a task into one of those statuses asks why and saves the answer as a task comment in the same operation, so the decision and its context cannot drift apart. **Will Not Do** starts with this requirement, and new statuses can now be created directly from the Statuses page header.

### Read-only access for trusted assistants

Deployments configured for it can now offer a read-only MCP connection for Claude Desktop. A trusted assistant can inspect tasks, projects, categories, notes, contacts, calendars, activity, and workspace metrics without receiving any ability to create, edit, delete, or upload workspace data.

## Improved

### Changes appear while they are still fresh

Comments, checklist updates, attachments, and activity written by the server now appear as soon as the save finishes instead of waiting for a refresh. Project and category attachment changes also refresh across open views and connected teammates.

Changing task filters, searches, sorting, pages, or views while results load now keeps the newest request, so a slower earlier response cannot replace the choice you just made.

### Activity tells the fuller story

Activity now covers access groups, visibility grants, teammates, statuses, digest settings and runs, workspace identity and banner changes, Google Calendar connections, and email administration. Task updates show clearer field-level changes, checklist pastes produce one useful summary instead of a burst of separate events, and status explanations appear alongside the change that prompted them.

Categories, projects, contacts, calendar dates, notes, comments, and resource attachments now save their activity history in the same database transaction. If either the change or its required history fails, neither is left half-finished.

### Safer files and richer text

Contact image uploads now save together with their contact, and replacing, removing, or deleting an uploaded image also cleans up the old file. Rich-text fields preserve intentional spacing and show Markdown headings while editing.

Modals now require a deliberate close action, protecting longer edits from an accidental backdrop click.

### One identity across the workspace

A workspace now uses one instance name for page titles, digest emails, link previews, the sidebar wordmark, and the footer. Link previews draw their name and description directly from Identity, and the compact footer is now the consistent treatment across signed-in pages, sign-in screens, and demo mode.

Owners can write the workspace notice under **Banner** in Settings, including an optional link and label. Updating the message brings the banner back for teammates who dismissed an older notice, while an untouched setting continues to use the deployment default.

### A calmer canvas

The workspace now sits on a subtle paper texture with solid task columns that stay readable over it. The board fills the space above the footer, keeping its horizontal scroller against the bottom edge, and the latest-release card starts collapsed on smaller screens with its version beside the title when space allows.

Projects now lead with active work, follow their lifecycle order, and default new projects to Discovery. **Will Not Do** also carries a clearer description wherever the default workflow is shown.

Project and category visibility controls now stay with their own editors instead of appearing as a second set of controls on the Access page.
