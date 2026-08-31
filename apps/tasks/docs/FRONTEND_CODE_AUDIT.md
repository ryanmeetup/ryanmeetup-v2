# Tasks frontend code audit

Status: every finding recorded here has been remediated. What remains is the
tail of the proposed plan, listed under "Still open."

This document records a staff-level maintainability audit of the Tasks app. The
review focused on code smells, duplicated behavior, unclear ownership, failure
modes, and code that is difficult for a human reader to safely change. It
covers `apps/tasks` and the shared UI code directly involved in the findings.

## Executive summary

The codebase has a good foundation: domain-oriented folders, shared mutation
and validation helpers, a sizeable pure-function test suite, consistent UI
primitives, and explicit architectural guidance. Lint and all existing unit and
route tests passed during the audit.

The largest risks were concentrated at orchestration boundaries. Each is now
addressed:

- a task query could be skipped while an older request was in flight —
  `lib/latest-request.ts` gives `useTaskPageLoader` and
  `components/resources/useResourceAccessState.ts` abortable,
  latest-query-wins loading, covered by `tests/unit/latest-request.test.ts`;
- multi-step server writes could commit only part of a workflow and still
  return an error — category, project, and contact writes now go through the
  transactional RPCs in
  `supabase/migrations/20260914000000_transactional_resource_mutations.sql`,
  which also move activity logging into the same transaction as the content
  write;
- contact images were uploaded directly from the browser before the associated
  contact was saved — uploads now run behind `app/api/contacts` through
  `lib/server/contact-image-storage.ts`, which owns `contacts.image_path` and
  retires the previous object only after the database write succeeds;
- several feature components combined state, networking, domain rules,
  permissions, and large render trees — Calendar is split into
  `useCalendarEventEditor`, `useCalendarGoogle`, `CalendarEventEditorModal`,
  `CalendarGridAgenda`, and `GoogleCalendarControls` over a pure
  `lib/calendar/calendar-view.ts`, and Categories and Projects share the
  extracted resource hooks plus `components/categories/category-workspace.ts`;
- the most stateful UI workflows had little behavioral coverage — the extracted
  pure modules carry unit tests (`calendar-view`, `category-controller`,
  `contact-image-storage`, `latest-request`); and
- the app-specific database instructions contradicted the repository source of
  truth — see the finding below.

## Findings

### Operational: migration instructions contradicted the repository source of truth — resolved

The root `AGENTS.md` requires every schema change to be a committed file under
`apps/tasks/supabase/migrations`, and explicitly identifies the old
temporary-file workflow as the cause of cross-instance drift.

`apps/tasks/AGENTS.md` still instructed agents to apply changes directly, use
temporary SQL, delete migration files, and avoid committing migrations. Because
the app-specific file is more local to Tasks work, that contradiction could
direct a future change toward the exact unsafe workflow the root policy exists
to prevent.

Resolved by:

- Replacing the stale section in `apps/tasks/AGENTS.md` with a reference to the
  root policy, keeping only the app-specific parts (idempotence and the
  access-control specification).
- Correcting `docs/DATABASE.md`, which claimed chronological migration files
  are not retained in this repository, and which described `handle_new_user`
  as a function the linked project receives directly.
- Making `docs/DATABASE.md` agree with the per-instance handoff rule: RMT is
  reachable from this machine and gets `supabase db push`; PRD is not reachable
  and gets paste-ready SQL for its dashboard SQL Editor. The "Outstanding"
  section previously handed out `supabase link` and `supabase db push` for PRD.

`docs/MULTI_INSTANCE.md` was reviewed and already agreed with the policy.

## Still open

These were proposed during the audit and have not been done. None of them is a
correctness risk; they are consolidation work.

- Consolidate request-schema primitives and domain schema ownership.
- Separate the embedded management surface from the dialog API.
  `CategoriesModal.tsx` and `ProjectsModal.tsx` are still around 1,200 lines
  each, and `CalendarPageClient.tsx` around 640.
- Add component and integration coverage around the new controller boundaries.
  The extracted pure modules have unit tests; the controllers themselves do
  not.
- Consider lightweight lint or review limits for new page-controller
  responsibilities, rather than enforcing an arbitrary maximum file length.

## Validation baseline

At the time of the audit:

- `npm run lint --workspace=@ryanmeetup/tasks` passed.
- `npm test --workspace=@ryanmeetup/tasks` passed: 61 files and 387 tests.
- `git diff --check` passed before this document was added.
- No production code was changed as part of the audit.

Passing checks did not invalidate the findings above. Most of them concerned
runtime orchestration, transaction boundaries, architectural coupling, or UI
flows that the checks do not exercise.
