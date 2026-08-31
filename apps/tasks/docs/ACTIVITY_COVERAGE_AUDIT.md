# Activity Coverage Audit

Audit date: 2026-08-31
Status: every finding below has been remediated, except the two noted under
"Left as they are." The database half ships in
`supabase/migrations/20260917000000_activity_coverage.sql`.

A trace of every write path in the Tasks app (API routes, RPCs, and database
triggers) against what `/api/activity` reads, filters, and renders. The
question asked was: **what happens in this workspace that never shows up on the
Activity page?**

---

## How activity works

Two sources are merged in `app/api/activity/route.ts`:

1. **`task_activity`** — task-scoped rows. Written by the `log_task_change`
   trigger on every task insert and update, plus explicit inserts from
   `app/api/task-details/route.ts` (comments, checklist items) and
   `app/api/task-attachments/route.ts`.
2. **`permission_audit_events` filtered to `after_state @> {"activity": true}`**
   — resource-scoped and workspace-scoped rows. Written by the triggers in
   `20260914000000_transactional_resource_mutations.sql` and
   `20260917000000_activity_coverage.sql`, and by API routes through
   `recordWorkspaceActivity` (`lib/server/privileged-api.ts`) — which is the
   feed's counterpart to `auditPrivilegedAction`, whose
   `privileged_audit_events` rows only app owners read.

Event kinds live in `lib/activity/activity-events.ts`, shared by the route's
filter and the page's chips so the two cannot drift.

---

## A. Recorded in the database, but the read path dropped it — resolved

### A1. All calendar activity was invisible

The visibility ladder ended in `event.target_type === "organization"`, so every
`calendar_event.*` row evaluated to `false`.

Resolved by giving `calendar_event` a branch that mirrors the
`calendar_events_select` policy — readable per project _and_ per category. The
trigger now records `category_id` alongside `project_id`, so the check still
resolves after the event is deleted. Labels, an event kind, and a "Calendar"
chip were added with it.

### A2. `project.delete` and `category.delete` could never render

Visibility required the row to still exist, which a deletion guarantees it does
not.

Resolved by treating the three top-level deletions (`project.delete`,
`category.delete`, `note.delete`) as team-visible: a resource disappearing is a
workspace-level fact in the way an edit to it is not. Matched on the exact
action, never on the target type, so the `project.attachment.delete` events
that share the `project` target type stay access-scoped.

### A3. Contact-category creation was logged against the wrong table

`save_contact_with_activity` emitted `category.create` for a
`contact_categories` row, which the route then checked against `work_groups`
ids. It never matched.

Resolved: the event is now `contact_category.create` with target type
`contact_category` and `resource_href` `/contacts`.

### A4. `note.delete` was visible only to the person who deleted it

Covered by the A2 carve-out; the `actor_id` fallback is gone.

### A5. A missing service-role key silently removed half the feed

The route fell back to `{ data: [], error: null }` and rendered normally.

Resolved: no admin client is now a 503. A half-empty page that looks complete
is worse than an outage, particularly because the two Tasks instances are
configured separately.

---

## B. Never recorded at all — resolved

### B1. Note comment edits and deletes

`log_note_comment_workspace_activity` was `after insert` only. It now covers
update and delete, writing `note.comment.update` and `note.comment.delete`; a
touch that leaves the body unchanged still records nothing.

### B2. Contact people

Adding, removing, or changing a person collapsed into a generic
`organization.update`.

`save_contact_with_activity` replaces people and category assignments
wholesale, so a row trigger would only ever see delete-all/insert-all. The diff
is taken inside the transaction instead, emitting
`organization.person.add/update/remove` naming the person, and
`organization.categories.update` naming the categories added and removed.

### B3. Statuses / B4. Access / B5. Team

All audited without reaching the feed. Each route now also calls
`recordWorkspaceActivity`: `status.create/update/reorder/delete`,
`project.access.update`, `category.access.update`,
`access_group.create/update/delete/membership`, `team.invite`, `team.remove`.
Access changes carry the new mode; team events carry the person's name, read
before the removal so it survives it.

### B6. Owner changes

`replace_project_owners_and_update` and `update_category_with_owners` delete
and reinsert owners inside the transaction. They now emit
`project.owners.update` / `category.owners.update` with a `detail` naming who
was added and removed, built by `owner_change_detail`.

### B7. Other uninstrumented surfaces

Now recorded: Google Calendar connect and disconnect, instance settings, logo
uploads, digest settings, digest runs, and scheduled-email cancel/delay. Each
write happens after the operation has already succeeded and never fails it.

---

## C. Recorded, but rendered wrong or unfilterable — resolved

### C1. Task comments had no filter chip

`added a comment` and its siblings fell through `eventKind()` to `"other"`,
which no chip offered — unreachable by include, unblockable by exclude.

Resolved: a "Comments" kind covering both task and note comments, and an
"Other" chip so the fallback is reachable too. Kinds and chips now come from
one list, and `tests/unit/activity-events.test.ts` asserts every kind the
mapper can produce has a chip. Resource attachments moved from the "Projects"
and "Categories" kinds to "Attachments", so one chip reaches every attachment
in the workspace.

### C2. `project.attachment.update` rendered as raw machine text

Labelled, along with `category.attachment.update` and every action added here.

### C3. Attachment file names were discarded

The route's mapping now carries `attachment_name` and a general-purpose
`detail`, rendered as a muted suffix after the label.

---

## D. Task-save diff gaps — resolved

### D1. A save that changed status _and_ other fields lost the other fields

`log_task_change` was a strict if/elsif chain: a status change won and wrote a
single `moved task` row, so a rename bundled into the same save was never
recorded anywhere.

Resolved: a status change and a field edit are two facts about one save, so
they are two rows. `savedTaskRecords` hands both back — they share the
transaction's timestamp, which is what identifies the pair — and the field list
omits `status`, which the move row already renders as both status pills.

### D2. Two saves within 60 seconds could drop the second diff

`recordTaskChangeActivity` matched the most recent `updated the task` row from
the last minute. `save_task` now returns `activity_id`, the row it actually
wrote, published on a transaction-local setting by the trigger.

### D3. Reordering within a column wrote empty "Task updated" rows

The trigger now compares the row minus `status_id`, `board_position`, and the
completion timestamps derived from the status. A drag inside a column, and the
lifecycle trigger's own writes, record nothing.

### D4. Field coverage note

`TASK_CHANGE_FIELDS` covers 13 fields and that set is correct for what a user
edits.

Worth recording explicitly: auto-archive at completion + 14 days is evaluated
at _read_ time (`set_task_completion_lifecycle` writes the future timestamp;
`lib/tasks/task-view.ts` compares it to the clock), not as a row change. A task
silently leaving every board on day 14 has no activity row, by design.

---

## E. Coverage and scale — resolved

### E1. The SQL-level filter was dead code

`applyActivityFilters` was invoked with an always-empty `URLSearchParams`. It
now receives the real ones. The event-kind branches were deleted rather than
revived: a kind such as "note" or "comment" spans both sources, so translating
half an include list into SQL would drop rows the JS filter would have kept.

### E2. The row caps were a correctness problem

The route pulled its rows and _then_ applied the date window, so a "Past 30
days" query could silently return fewer rows than exist. The `when` cutoff, and
the project and person filters, are now pushed into both queries.

### E3. `permission_audit_events` had no indexes

Added: `created_at desc`, plus a partial index for the `activity: true`
predicate the feed queries under.

### E5. Demo mode under-reported

`useTaskChecklist` recorded `add` in demo mode but not `toggle` or `remove`.
Both now record, using the same action strings the API writes. Demo saves also
write the same two rows a real save does.

---

## Left as they are

- **E4. Other surfaces read a narrower slice.** The dashboard loads only
  `action = 'moved task'`, limit 20, which is what that panel is for. The task
  detail panel reads only `task_activity` for its own task, so a task's history
  does not mention its project being renamed or its access changing. Both are
  scope decisions, not defects; widening either is a product change.
- **Task labels, favorite projects, and profile updates.** `task_labels` has no
  API route and no entry in `TASK_CHANGE_FIELDS`; favorites and profile
  preferences are personal, not workspace-visible. None of the three would
  explain anything to a teammate.
