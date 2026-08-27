---
version: 5
slug: v5-collaboration-in-context
author: Ryan Le
date: "2026-08-20"
dateLabel: August 20, 2026
title: Collaboration, connected resources, and faster task flows
summary: Tasks, notes, contacts, and workspace resources now work together more naturally, with richer collaboration and quicker everyday editing.
overview:
  - A shared calendar for deadlines, important dates, and time away
  - A neutral, reusable first-run demo workspace, previewable from Admin
  - Collaborative notes, comments, and linked task references
  - Faster task editing, filters, and searchable dropdowns
  - Richer project resources and contact organization
  - Weekday task rundowns, stronger onboarding, and fuller activity history
---

## New

### One calendar for the Ryan schedule

The new Calendar brings task deadlines, project or category milestones, and team time away into one monthly view. Sensitive dates follow the same project and category access rules as the work they describe, while away periods help everyone know when a Ryan is unreachable.

Owners can connect one workspace Google Calendar and grant access through access groups. Events from Google appear automatically for permitted teammates, while tasks and dates created in Tasks stay in Tasks unless someone publishes them. Any important date or time-away entry can be copied to the shared Google Calendar with one checkbox, and editing or deleting the date keeps the Google copy in step.

Google events now use their own magenta calendar notation so they stay distinct from blue task deadlines, and routine Home blocks no longer clutter the shared view. Time away stays at the top of each day, crowded dates open into a complete day agenda, the details sidebar can be hidden between visits, and Google connection controls live in a compact status badge above the calendar.

Connecting Google Calendar now keeps deployment details out of the everyday flow: owners continue with Google when the workspace is ready, get a clear path to Admin when setup is still needed, and see friendlier guidance when a connection cannot be completed.

### Weekday task rundown

Assignees now receive one concise weekday email grouping overdue work, today’s deadlines, upcoming tasks, and high-priority work without a due date. Empty rundowns are skipped to keep inboxes—and the email budget—tidy.

Those rundowns now mirror the task board more closely, with higher-contrast cards, icon-led sections, and roomier task metadata for quicker scanning.

Workspace owners can monitor Resend's daily and monthly email allowance, recent sends, and color-coded delivery states from the new Usage page. Weekday digests now appear there 30 minutes before delivery, giving owners time to inspect the exact message, delay it, or cancel it.

### Notes that become tasks

Converting a note into a task now removes the original note and opens the new task directly, keeping the workspace tidy and the next step close at hand.

Category filters keep every kind of note visible in one compact row, while each note carries its category label for faster scanning.

### Collaborative note conversations

Teammates can comment on notes, with authors able to edit or remove their own comments.

### Threaded task comments

Comments now support nested replies, making it clear which message a teammate is responding to while keeping the full conversation together.

## Improved

### A cleaner first look

The zero-configuration demo now opens as a neutral team workspace with sample teammates, projects, tasks, and calendar dates that fit any organization. Demo mode skips the production beta notice and uses a compact footer, which is also the default footer treatment on sign-in and account-recovery screens.

New workspaces now open with the complete Ryan Meetup workflow—Backlog, Todo, In Progress, In Review, Done, and Will Not Do—and older empty instances repair the missing board automatically.

Owners can see that first look for themselves without a second deployment: **Enter demo preview** on the Admin overview swaps the workspace for the demo fixtures in their browser alone, and the demo banner carries the way back out. Nothing touched during a preview reaches the database, and the preview lapses on its own after four hours.

### A footer that finishes the page

The compact footer is no longer a single line. It now carries the wordmark and its tagline, whatever footer links the workspace has configured, social icons, and the credit line beneath a divider — so the quiet treatment still looks finished on sign-in screens and in the demo.

Route changes now keep the workspace navigation and header in place while only the destination page loads, so moving around the app feels steady even when the next screen needs fresh data.

If workspace data cannot load, the app now explains the failure and provides a reference instead of repeatedly sending you to your profile as though onboarding were incomplete.

### Notes that read like notes

The notes board now presents each note as a finished card: its title, formatted text, author, and comment count at a glance. Links written inside a note appear as chips you can follow, alongside the task or project the note became.

Opening a note brings up its full text and conversation, and editing happens there too, saved deliberately with Save note instead of quietly while you type.

### Complete teammate onboarding

Invited teammates now choose their sign-in password while completing their profile, so they can return to the workspace without needing a password-reset workaround.

### Dynamic task filters

Tasks can be included or excluded by category tags. Tag choices stay in sync with each category, so renamed, added, and removed tags are reflected automatically.

### Faster dropdowns

Dropdown menus stay compact, include search, and keep your own profile close to the field when choosing an assignee or reporter.

Favorite projects now appear first when choosing a project while creating or editing a task.

### Connected task links

Task creation and edit confirmations include the task number as a direct link, making it easy to jump straight to the work you just changed.

Ticket keys in comments, such as RMT-123, also link directly to the referenced task when it exists.

### Focused task editing

Editing from a task page stays focused on task fields while checklist items, attachments, comments, and activity remain on the page where they are already available. On wide screens, task details and activity stay in view while the main task work scrolls.

Tasks also remain visible on category-filtered boards when their project is changed.

### Richer resource management

Supporting links, notes, and attachments are easier to reorder on touch, pointer, and keyboard devices, and supporting notes now include rich Markdown formatting.

Project and category create and edit dialogs now use one clear visibility choice. New projects begin with their named owners only, selected groups can collaborate on tasks without becoming project managers, and the Access page manages project and category visibility without opening every group separately.

Modal headers and action bars stay in place while longer content scrolls between them.

Edit, archive, and delete controls use consistent colors throughout the workspace. Empty projects and categories can now be permanently deleted, while archived items use a cleaner badge treatment.

### Organized contacts

Contacts are grouped by relationship—from brand partners and venues to media, talent, hospitality, and event vendors—so a growing network stays easy to scan.

### Fuller workspace activity

Activity now keeps a lasting record when a task is deleted, alongside updates across projects, categories, notes, contacts, and attachments.
