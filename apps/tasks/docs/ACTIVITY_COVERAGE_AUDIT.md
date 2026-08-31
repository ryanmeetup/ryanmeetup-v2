# Activity Coverage Audit

Audit date: 2026-08-31

A trace of every write path in the Tasks app (API routes, RPCs, and database
triggers) against what `/api/activity` actually reads, filters, and renders.
The question asked was: **what happens in this workspace that never shows up on
the Activity page?**

---

## How activity works today

Two sources are merged in `app/api/activity/route.ts`:

1. **`task_activity`** — task-scoped rows. Written by the `log_task_change`
   trigger (`20260731000000_baseline_schema.sql:840`) on every task insert and
   update, plus explicit inserts from `app/api/task-details/route.ts`
   (comments, checklist items) and `app/api/task-attachments/route.ts`.
2. **`permission_audit_events` filtered to `after_state @> {"activity": true}`**
   — resource-scoped rows. Written by the triggers added in
   `20260914000000_transactional_resource_mutations.sql`.

The merged list then passes through a hand-written visibility ladder and a JS
filter, both in the route, before pagination.

### Actions currently written

| Source | Action strings |
| --- | --- |
| `log_task_change` trigger | `created the task`, `moved task`, `updated the task` |
| `create_subtask_with_activity` | `added checklist item "…"` |
| `task-details` route | `completed a checklist item`, `reopened a checklist item`, `deleted a checklist item`, `added a comment`, `edited a comment`, `deleted a comment` |
| `task-attachments` route | `attached "…"`, `removed attachment "…"` |
| `log_task_deletion` trigger | `task.delete` |
| `log_workspace_resource_activity` trigger | `project.*`, `category.*`, `organization.*`, `calendar_event.*` (`create` / `update` / `delete` / `archive` / `restore`) |
| `log_note_workspace_activity` trigger | `note.create/update/archive/restore/delete/convert` |
| `log_note_comment_workspace_activity` trigger | `note.comment` |
| `log_resource_attachment_workspace_activity` trigger | `project.attachment.add/update/delete`, `category.attachment.add/update/delete` |
| `save_contact_with_activity` RPC | `category.create` (for newly created **contact** categories) |

---

## A. Recorded in the database, but the read path silently drops it

### A1. All calendar activity is invisible

The trigger at `20260914000000_transactional_resource_mutations.sql:80-85`
writes `calendar_event.create` / `.update` / `.delete` with
`target_type = 'calendar_event'`. The visibility ladder in
`app/api/activity/route.ts:255-268` ends with:

```ts
: event.target_type === "organization";
```

so `calendar_event` evaluates to `false` on every row and is filtered out
before rendering. Every calendar mutation since that migration is dead weight
in the audit table.

Three layers would need fixing, not one:

- `route.ts` visibility ladder — add a `calendar_event` branch (gated on the
  caller's `calendar_events` RLS visibility, which is per-project and
  per-category, not global).
- `lib/activity/task-activity.ts` — no labels for `calendar_event.*`.
- `route.ts` `eventKind()` and `ActivityPageClient` event options — no kind and
  no filter chip.

### A2. `project.delete` and `category.delete` can never render

Visibility for a `project` event requires
`visibleProjectIds.has(event.target_id)`, but the project row is gone by the
time anyone reads the feed. Same for `category.delete` against `work_groups`.

The `"Project deleted"` and `"Category deleted"` entries in `taskActivityLabel`
(`lib/activity/task-activity.ts:35`) are unreachable code.

Deletion visibility has to be derived from something that survives the delete —
the recorded `project_id` in `after_state`, a tombstone, or simply treating
delete events as team-visible the way `organization` already is.

### A3. Contact-category creation is logged against the wrong table

`save_contact_with_activity`
(`20260914000000_transactional_resource_mutations.sql:541-556`) emits a
`category.create` event whose `target_id` is a `contact_categories` row. The
route checks that id against `work_groups` ids, so it never matches and the
event is always filtered out.

Its `resource_href` is also `/categories`, which is the work-group categories
page, not the contacts categories surface.

### A4. `note.delete` is visible only to the person who deleted it

```ts
: event.target_type === "note"
  ? Boolean(event.target_id &&
      (visibleNoteIds.has(event.target_id) ||
       event.actor_id === authorization.user.id))
```

The note row is gone after a delete, so `visibleNoteIds` never contains it. The
deleter sees the event via the `actor_id` fallback; nobody else does.

### A5. A missing service-role key silently removes half the feed

`getAdminClient()` returns `null` when neither `SUPABASE_SECRET_KEY` nor
`SUPABASE_SERVICE_ROLE_KEY` is set, and the route falls back to
`{ data: [], error: null }`. All project, category, note, contact, and
task-delete activity disappears and the page renders normally with no error.

This deserves an explicit 503 rather than a silent empty half — particularly
because the two Tasks instances (RMT and PRD) are configured separately, so one
can be misconfigured while the other is fine.

---

## B. Never recorded at all

### B1. Note comment edits and deletes

`log_note_comment_workspace_activity` is `after insert` only
(`20260914000000_transactional_resource_mutations.sql:167-169`). `PATCH` and
`DELETE` in `app/api/note-comments/route.ts` leave no trace.

Task comments log added / edited / deleted. Note comments log only added. The
two read inconsistently for no stated reason.

### B2. Contact people

Adding a person to a contact, removing one, or changing their name, title,
emails, phone, or Instagram handle all collapse into a single generic
`organization.update`, because only the `contacts` parent row carries a
trigger. `contact_people`, `contact_category_assignments`, and
`contact_categories` have none.

### B3. Statuses

`status.create`, `status.update`, `status.reorder`, and `status.delete` are
audited in `app/api/statuses/route.ts` but without `activity: true`, so they
never reach the feed. Renaming or deleting a status reshapes every board in the
workspace and nobody can see why.

### B4. Access changes

`project.access.update`, `category.access.update`, and all `access_group`
create / update / delete operations are audited without `activity: true`. A
project going from open to restricted — which changes what every teammate can
see — is invisible.

### B5. Team membership

`team.invite` and `team.remove` — same. Someone appearing in or vanishing from
assignee dropdowns has no explanation anywhere in the product.

### B6. Owner changes

`replace_project_owners_and_update` and `update_category_with_owners` delete and
reinsert the owners rows inside the transaction. The only trace is a generic
`project.update` / `category.update` with no named diff, so "who owns this"
changes are recorded but not described.

### B7. Other uninstrumented surfaces

- Google Calendar connect / disconnect (`app/api/integrations/google-calendar/`)
  — no audit and no activity.
- Instance settings, digest settings, digest runs, email cancel/delay, profile
  updates, logo uploads — audited without `activity: true`.
- Task labels — `task_labels` and `labels` have no API route at all, no
  activity, and no entry in `TASK_CHANGE_FIELDS`.
- Favorite projects (`app/api/profile/favorite-projects/route.ts`) — no record.

Labels and favorites are arguably fine to leave out. Digest runs and settings
changes probably are not.

---

## C. Recorded, but rendered wrong or unfilterable

### C1. Task comments have no filter chip

`added a comment`, `edited a comment`, and `deleted a comment` fall through
every branch of `eventKind()` (`app/api/activity/route.ts:296-306`) to
`"other"`. The event options list
(`components/activity/ActivityPageClient.tsx:406-415`) has no "Comments" entry.

Two practical consequences:

- Selecting **any** event filter hides all comment activity, because `"other"`
  is never in `includedEvents`.
- There is no way to filter *for* comments, and no way to exclude them either.

`"other"` is a black hole: unreachable by include, unblockable by exclude.
`calendar_event.*` lands there too (on top of A1).

### C2. `project.attachment.update` renders as raw machine text

The attachment trigger emits `.add`, `.delete`, **and** `.update` — the last
fires when an attachment's `name` or `body` changes
(`20260914000000_transactional_resource_mutations.sql:194-198`). But
`taskActivityLabel` only maps `.add` and `.delete`, so the fallback

```ts
return action.charAt(0).toUpperCase() + action.slice(1);
```

renders the literal string `Project.attachment.update` in the feed. Same for
`Category.attachment.update`.

### C3. Attachment file names are discarded

The trigger writes `attachment_name` into `after_state`, but the route's
mapping (`app/api/activity/route.ts:264-283`) copies only `resource_name`,
`resource_href`, and `project_id`. So a row reads "Project attachment added —
Fall Launch" and never names the file.

Task attachments *do* include the file name, because it is baked into the
action string (`attached "…"`). The two attachment surfaces read differently.

---

## D. Task-save diff gaps

### D1. A save that changes status *and* other fields loses the other fields

This is the sharpest defect in the audit.

`log_task_change` is a strict if/elsif chain: a status change wins and writes a
single `moved task` row, never an `updated the task` row.

```sql
if tg_op = 'INSERT' then ... 'created the task'
elsif old.status_id is distinct from new.status_id then ... 'moved task'
else ... 'updated the task'
```

`recordTaskChangeActivity` (`lib/server/privileged-api.ts:94-131`) then looks
specifically for a recent row whose action is `updated the task`, finds none,
and returns `false`.

**Rename a task and move it to Done in one save, and the rename is never
recorded anywhere.** Same for a re-assignment, a due-date change, a project
move, or a category change bundled into the same save as a status change.

### D2. Two saves within 60 seconds can drop the second diff

`recordTaskChangeActivity` selects the most recent `updated the task` row from
the last 60 seconds and bails if `Array.isArray(details.changes)` is already
true. Rapid successive saves of the same task can leave the second one as a
bare "Task updated" with no field list.

### D3. Reordering within a column writes empty "Task updated" rows

`move_task` sets `status_id` (unchanged) and `board_position`, so the trigger
falls to the `else` branch and logs `updated the task` with no changes
attached. Every drag-to-reorder produces a contentless row. Noise rather than a
gap, but it dilutes the feed and inflates the row caps described in E2.

### D4. Field coverage note

`TASK_CHANGE_FIELDS` (`lib/activity/task-change-summary.ts:7-21`) covers 13
fields and that set looks correct for what a user edits.

Worth recording explicitly: auto-archive at completion + 14 days is evaluated
at *read* time (`set_task_completion_lifecycle` writes the future timestamp;
`lib/tasks/task-view.ts` compares it to the clock), not as a row change. A task
silently leaving every board on day 14 has no activity row, by design.

---

## E. Coverage and scale

### E1. The entire SQL-level filter is dead code

`applyActivityFilters` is roughly 110 lines and is invoked as:

```ts
itemQuery = applyActivityFilters(
  itemQuery,
  new URLSearchParams(),   // ← always empty
  previewProjectIds,
  previewInaccessibleTaskIds,
);
```

(`app/api/activity/route.ts:174-183`). Only the access-preview branches do
anything. All real project / people / event / when filtering happens in JS
afterward, on rows already fetched.

### E2. The row caps are therefore a correctness problem, not just a perf one

The route pulls `.limit(5000)` task rows and `.limit(2000)` audit rows, and
*then* applies the date window and every other filter.

Past those counts, a "Past 30 days" query can return fewer rows than actually
exist in the last 30 days, with no indication to the user that anything was
truncated. Pushing at least `when` into the SQL query fixes both the truncation
and the payload size.

### E3. `permission_audit_events` has no indexes

Beyond its primary key, the table has no index on `created_at` and no GIN index
on `after_state` (`20260731000000_baseline_schema.sql:1889`). Every Activity
page load runs a full scan plus a sort with a jsonb containment predicate.

### E4. Other surfaces read a narrower slice

- The dashboard loads only `action = 'moved task'`, limit 20
  (`app/(workspace)/page.tsx:70-75`).
- The task detail panel reads only `task_activity` for that one task, so a
  task's own history never mentions its project being renamed, its category
  being archived, or its access changing.

### E5. Demo mode under-reports

In `components/tasks/useTaskChecklist.ts`, `add` records checklist activity in
demo mode but `toggle` and `remove` do not (`persist` is `undefined` and there
is no `recordActivity` call). The demo feed shows less than the real one for the
same interactions.

---

## Suggested fix order

**First — small changes that unblock activity already being written:**

1. **A1 (calendar)** — add the `calendar_event` visibility branch, labels,
   `eventKind`, and filter option.
2. **A2 / A3 / A4 (delete visibility)** — a deleted resource cannot be looked up
   in a "still exists" set; these need an explicit carve-out, plus routing
   contact-category events away from the `work_groups` check.
3. **D1 (status + field save collapse)** — this is quietly losing real edits
   today and is the only item in the audit that loses user intent rather than
   just failing to display it.

**Second — presentation fixes, roughly one-liners each:**

4. **C1** — add a "Comments" event kind and chip; decide what `"other"` should
   do when an include filter is active.
5. **C2** — add `project.attachment.update` / `category.attachment.update`
   labels.
6. **C3** — surface `attachment_name` in the route's `details` mapping.

**Third — scale, before the workspace outgrows the caps:**

7. **E1 / E2** — push `when` (at minimum) into SQL, or paginate at the database.
8. **E3** — index `permission_audit_events (created_at desc)` and consider a
   partial index for the `activity: true` predicate.

**Then, as product decisions rather than bugs:** B3 (statuses), B4 (access),
B5 (team) are all workspace-visible changes that currently have audit rows but
no activity rows. Promoting them is a matter of adding `activity: true` and a
label, plus deciding who should see them.
