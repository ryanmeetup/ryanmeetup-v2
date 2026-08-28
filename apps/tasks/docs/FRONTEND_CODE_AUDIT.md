# Tasks frontend code audit

Status: audit findings; no remediation in this document has been implemented.

This document records a staff-level maintainability audit of the Tasks app. The
review focused on code smells, duplicated behavior, unclear ownership, failure
modes, and code that is difficult for a human reader to safely change. It
covers `apps/tasks` and the shared UI code directly involved in the findings.

## Executive summary

The codebase has a good foundation: domain-oriented folders, shared mutation
and validation helpers, a sizeable pure-function test suite, consistent UI
primitives, and explicit architectural guidance. Lint and all existing unit and
route tests passed during the audit.

The largest risks are concentrated at orchestration boundaries:

- a task query can be skipped while an older request is in flight;
- multi-step server writes can commit only part of a workflow and still return
  an error to the client;
- contact images are uploaded directly from the browser before the associated
  contact is saved;
- several feature components combine state management, networking, domain
  rules, permissions, and large render trees in one file;
- the most stateful UI workflows have little behavioral test coverage; and
- the app-specific database instructions contradict the repository source of
  truth.

The recommended order of work is:

1. Correct the contradictory migration documentation.
2. Make resource, owner, and activity writes transactional.
3. Fix task-query request concurrency and add regression coverage.
4. Move contact image handling behind an application API boundary.
5. Decompose the Calendar, Categories, and Projects controllers.
6. Narrow `WorkspaceData` dependencies and consolidate schema primitives.
7. Add focused component and integration coverage around the extracted
   controllers.

## Findings

### High: task loading can drop a newer query

`hooks/useTaskPageLoader.ts` uses a component-level `loading` boolean as a
request guard. `loadTaskPage` returns immediately when that flag is true. If a
filter, search term, page, page size, sort, or view changes while an earlier
request is active, the effect invokes the loader, the loader exits, and no
dependency changes again when the earlier request finishes. The requested
query can therefore be skipped.

The request also has no `AbortController` or request-generation check. If this
guard is removed without adding one, an older response could overwrite a newer
result.

Evidence:

- `hooks/useTaskPageLoader.ts:60-62` contains the `loading` early return.
- `hooks/useTaskPageLoader.ts:130-147` drives requests from an effect.
- `components/activity/ActivityPageClient.tsx:237-284` demonstrates the safer
  abort-on-query-change pattern already used elsewhere in the app.

Recommendation:

- Give every query change its own abortable request.
- Abort the previous request in effect cleanup.
- Apply a result only when it belongs to the latest query generation.
- Keep explicit pending state, but do not use pending state to discard a newer
  request.
- Add a regression test that changes filters while the first response is
  unresolved.

### High: multi-step server mutations can leave partial state

Several API routes implement a single user action as multiple independent
database operations. A later failure can leave an earlier write committed.
Some routes then return HTTP 500 even though the requested content change has
already happened, which makes retry behavior unsafe and presents a false
failure state to the client.

Representative cases:

- `app/api/categories/route.ts:32-85` creates a category, then separately saves
  access, owners, and activity. The access failure path attempts manual cleanup,
  but the owner and activity paths do not restore the complete prior state.
- `app/api/categories/route.ts:116-136` deletes every category owner before
  inserting the replacement set. A failed insert leaves the category without
  owners.
- `app/api/projects/route.ts:98-120` uses the same delete-then-insert pattern for
  project owners.
- `app/api/contacts/route.ts:9-101` spans `save_contact`, a separate contact
  update, a reload, a workspace activity write, category reads, and more
  activity writes.
- `app/api/calendar-events/route.ts:47-74` commits a calendar event before
  recording activity and reports a 500 if activity fails.
- `lib/server/privileged-api.ts:67-121` records workspace activity through a
  separate privileged client, outside the content transaction.

This is a systemic pattern. Similar “saved, but activity could not be recorded”
responses appear in category, project, contact, note, comment, calendar,
attachment, status, profile, and access-group workflows.

Recommendation:

- Move authorization-sensitive and multi-row workflows into transactional
  database functions.
- Include required activity or audit rows in the same transaction as the
  content change.
- Return success only when the complete required workflow committed.
- Treat genuinely optional integrations, such as publishing a copy to Google
  Calendar, as warnings after a successful canonical write.
- Avoid manual rollback sequences in route handlers.

### High: contact image writes bypass the application mutation boundary

`components/contacts/ContactsPageClient.tsx:176-225` uploads an image directly
from the browser to the public `organization-images` bucket, constructs a
public URL, and only then calls the contact API.

Consequences:

- a failed contact save leaves an orphaned storage object;
- replacing or deleting a contact does not visibly clean up its previous image;
- storage naming and persistence details leak into a page controller;
- the server receives a URL rather than an owned storage object it can validate
  and reconcile; and
- the workflow diverges from the app rule that protected browser writes go
  through same-origin API routes.

Recommendation:

- Add a contact-image API workflow that validates the file, writes storage,
  updates the contact, and cleans up partial results.
- Store an owned storage path or similarly verifiable identifier rather than
  trusting an arbitrary client-provided public URL.
- Reuse the cleanup approach established by the resource attachment modules.
- Delete replaced and contact-owned images according to an explicit retention
  policy.

### Medium: core feature components have too many responsibilities

The largest components are not merely long render files. They combine local
state machines, data fetching, mutation orchestration, demo-mode behavior,
permission rules, transformations, notifications, and multiple large views.

Examples:

- `components/calendar/CalendarPageClient.tsx` is 1,540 lines. Its main
  component begins at line 275 and owns roughly 20 local state values, calendar
  derivation, Google Calendar loading and disconnection, event persistence,
  permissions, sidebars, summaries, and several dialogs.
- `components/categories/CategoriesModal.tsx` is 1,250 lines and owns creation,
  editing, access, owners, links, attachments, tags, archive, delete, filtering,
  confirmations, and rendering.
- `components/projects/ProjectsModal.tsx` is 1,086 lines with a closely parallel
  responsibility set.
- `AccessPageClient`, `ActivityPageClient`, `DashboardPageClient`,
  `ContactEditor`, `ContactsPageClient`, `NotesPageClient`, `TaskEditor`, and
  `TaskAdministration` are each more than 500 lines.

Recommendation:

- Extract only where there is a clear owner or independently testable contract.
- For Calendar, separate month/source loading, event-editor state and mutation,
  grid/agenda presentation, and Google connection controls.
- For resource management, separate create/edit controllers, access editing,
  destructive actions, and result-list presentation.
- Keep domain transformations outside JSX and outside effects where possible.
- Prefer a reducer when a feature has many state values that transition
  together.

### Medium: category and project management are parallel implementations

Categories and Projects implement nearly the same lifecycle independently:

- create and edit drafts;
- owner selection;
- link and attachment handling;
- access-group loading and saving;
- search and archive filters;
- optimistic workspace updates;
- archive, restore, and delete behavior; and
- pending, confirmation, and toast state.

Projects use `components/resources/useResourceEditState.ts`, while Categories
manually maintain name, description, color, links, tags, access, owners, and
pending state beginning at `components/categories/CategoriesModal.tsx:163`.
Access loading is separately implemented around
`components/projects/ProjectsModal.tsx:197` and
`components/categories/CategoriesModal.tsx:304`.

This duplication has already produced different state shapes and different
access-loading behavior between the two resources.

Recommendation:

- Create a shared resource-editor controller for the common lifecycle.
- Keep category color/tags and each resource's permission rules in feature-owned
  adapters or extensions.
- Share access request state and stale-response protection while keeping
  category/project API contracts explicit.
- Avoid a single overly generic “resource framework”; share stable behavior,
  not every conditional.

### Medium: `WorkspaceData` is a broad mutable state bag

`lib/workspace/workspace-types.ts:43-66` combines tasks, statuses, categories,
projects, profiles, comments, activity, attachments, labels, assignments,
owners, pagination, and access-preview state. Thirty-seven component files
import `WorkspaceData`.

The full object and its setter reach components such as:

- `components/tasks/TaskEditor.tsx:56-57`;
- `components/tasks/TaskAdministration.tsx:38-39`;
- `components/navigation/TaskHeaderActions.tsx:38-39`; and
- `components/categories/CategoriesModal.tsx:92-95`.

This makes dependencies hard to see, allows low-level components to mutate
unrelated collections, causes broad recomputation, and makes isolated tests
expensive to arrange.

Recommendation:

- Keep `WorkspaceData` at the workspace-store and page-controller boundary.
- Pass narrow view models and command callbacks to rendering components.
- Introduce domain-specific state slices where updates and realtime
  reconciliation can remain coherent.
- Continue using indexed-access types such as `WorkspaceData["profiles"]` only
  as a migration aid, not as the final component contract.

### Medium: critical UI orchestration has little behavioral coverage

The existing suite contains 61 passing test files and 387 passing tests, with
strong coverage of framework-light selectors, parsers, scheduling, activity,
and reconciliation logic. However:

- `vitest.config.mts:4-9` uses a Node environment and includes no component test
  setup;
- no component tests were found during the audit;
- `tests/e2e/workspace-navigation.spec.ts` verifies persistent desktop/mobile
  navigation;
- `tests/e2e/login.spec.ts` verifies security headers and basic login behavior;
  and
- no browser tests cover task query concurrency, calendar editing, resource
  modals, contact uploads, notes, access management, or optimistic rollback.

Recommendation:

- Do not attempt exhaustive snapshot coverage of the current monoliths.
- Extract controllers and test their transition and failure behavior.
- Add a few browser-level critical-path tests for task filtering during pending
  requests, resource owner changes, contact-image failure cleanup, and calendar
  save/delete behavior.
- Exercise both demo and server-backed adapters where their behavior must stay
  aligned.

### Lower: API schema primitives are duplicated

`lib/api-schema/shared.ts` defines `JsonObject`, `objectWithKeys`, text parsing,
UUID parsing, and UUID-list parsing. `lib/api-schema/index.ts:11-40` duplicates
most of those helpers instead of importing them. `lib/contacts/contact-schema.ts`
adds a third object/text/UUID implementation with slightly different semantics.
UUID parsing is duplicated again in server query and access modules.

Recommendation:

- Make `lib/api-schema/shared.ts` the sole owner of request-shape primitives.
- Split the 462-line `lib/api-schema/index.ts` into domain modules while keeping
  its deliberate public exports compatible.
- Name semantic differences explicitly—for example, `requiredTrimmedText` and
  `nullableTrimmedText`—rather than creating near-identical local helpers.
- Reuse a single UUID validator wherever the same UUID grammar is intended.

### Lower: embedded `Modal` makes invalid states representable

Full-page management surfaces use patterns such as:

```tsx
<Modal open setIsOpen={() => undefined} embedded>
```

Examples appear in Calendar, Contacts, and Notes. In embedded mode,
`packages/ui/src/Modal.tsx:119-142` renders a section and ignores modal open and
close behavior, but its type still requires `open` and `setIsOpen`.

The no-op callback is a signal that one component represents two different
concepts with an API shaped for only one of them.

Recommendation:

- Extract the embedded surface as a `Panel`, `ManagementSurface`, or similarly
  named shared composition.
- Alternatively, use a discriminated prop union so dialog-only props are
  impossible in embedded mode.
- Keep the visual treatment shared without making page surfaces pretend to be
  dialogs.

### Operational: migration instructions contradict the repository source of truth

The root `AGENTS.md:359-385` requires every schema change to be a committed file
under `apps/tasks/supabase/migrations` and explicitly identifies the old
temporary-file workflow as the cause of cross-instance drift.

`apps/tasks/AGENTS.md:174-187` still instructs agents to apply changes directly,
use temporary SQL, delete migration files, and avoid committing migrations.
Because the app-specific file is more local to Tasks work, this contradiction
can direct a future change toward the exact unsafe workflow the root policy is
designed to prevent.

Recommendation:

- Remove the stale app-specific migration section or replace it with a short
  reference to the root policy.
- Keep `docs/DATABASE.md` and `docs/MULTI_INSTANCE.md` consistent with that
  policy.
- Treat this as the first remediation because it can affect every later
  database fix.

## Proposed remediation phases

### Phase 1: protect correctness

- Reconcile migration documentation.
- Replace skipped task queries with abortable latest-query-wins loading.
- Add regression coverage for request races.
- Inventory every route that writes content and activity separately.
- Move category/project owner replacement and required audit writes into
  transactional RPCs.

### Phase 2: repair mutation boundaries

- Add a server-owned contact image workflow and cleanup behavior.
- Define which integrations are canonical and which are best effort.
- Standardize partial-success responses only for explicitly optional work.
- Remove manual multi-step rollback from route handlers.

### Phase 3: reduce frontend orchestration debt

- Split Calendar into focused controllers and views.
- Consolidate stable resource editor behavior shared by Categories and Projects.
- Narrow component props away from full `WorkspaceData` and arbitrary setters.
- Replace related collections of boolean/string state with explicit reducers or
  state machines where that improves transition clarity.

### Phase 4: consolidate and enforce

- Consolidate request-schema primitives and domain schema ownership.
- Separate the embedded management surface from the dialog API.
- Add component/integration tests around the new controller boundaries.
- Consider lightweight lint or review limits for new page-controller
  responsibilities rather than enforcing an arbitrary maximum file length.

## Validation baseline

At the time of the audit:

- `npm run lint --workspace=@ryanmeetup/tasks` passed.
- `npm test --workspace=@ryanmeetup/tasks` passed: 61 files and 387 tests.
- `git diff --check` passed before this document was added.
- No production code was changed as part of the audit.

Passing checks do not invalidate the findings above. Most findings concern
runtime orchestration, transaction boundaries, architectural coupling, or UI
flows that the current checks do not exercise.
