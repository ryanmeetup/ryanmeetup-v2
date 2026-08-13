# Ryan Meetup Tasks Instructions

These instructions supplement the repository-root `AGENTS.md` for work in
`apps/tasks`.

## Current architecture

The Tasks app is a private Next.js App Router workspace backed by Supabase. It
also has a local demo mode when the public Supabase environment variables are
absent. Preserve both paths when changing workspace behavior.

Code is organized by responsibility:

- `app/**/page.tsx` files are server-side route composition. They authenticate,
  load only the collections a page needs, interpret shareable query state, and
  pass initial data to a feature page client.
- `app/api/**/route.ts` files are HTTP boundaries. They authorize, parse and
  validate input, dispatch domain operations, and format responses. Keep
  database workflows and reusable query logic in `lib/server`.
- `components/<feature>` owns feature presentation and client orchestration.
  Large interactions should be split into focused views, panels, fields, and
  controller hooks instead of accumulating in a page client or modal.
- `components/global` is for Tasks-only UI used by several features. Generic,
  brand-consistent primitives still belong in `@ryanmeetup/ui`.
- `hooks` owns reusable Tasks client controllers. Keep feature-specific hooks
  beside their feature when they are not shared across the app.
- `lib` owns framework-light domain types, selectors, parsing, normalization,
  state reconciliation, and client mutation services.
- `lib/server` is the server-only application layer: authorization, request and
  response handling, privileged operations, persistence, and query services.
  Client modules must never import it, including indirectly through a barrel.
- `lib/supabase` owns browser and server client construction only.
- The linked Supabase project is the database and authorization source of truth.
  Historical migrations are not retained in this repository.

Use `@/` for app-owned absolute imports. Prefer domain-owned types such as
`task-types.ts`, `workspace-types.ts`, `resource-types.ts`, and
`activity-types.ts`; do not grow `lib/types.ts` into a new catch-all. Keep
feature `index.ts` exports narrow and intentional. Code within a feature should
usually import its siblings directly rather than expanding a barrel solely for
internal use.

## Server pages and workspace data

- Use `loadWorkspacePage` for authenticated workspace pages. Its options own
  owner checks and onboarding redirects; do not reproduce that flow in pages.
- Ask `loadWorkspacePage` for only the `WorkspaceCollection` values required by
  the page, then issue page-specific queries explicitly. Keep stable selection
  strings in `WORKSPACE_COLUMNS` or `database-shapes.ts` rather than allowing
  query shapes to drift.
- Pass Supabase results through `requireQueryData` or `requireQueryResult`.
  Silent `data ?? []` fallbacks can hide authorization, schema, and network
  failures and are not acceptable for required data.
- Keep initial database loading in Server Components. Client page components
  receive typed initial data and coordinate interaction; they must not become a
  second server-loading layer.
- `searchParams` is asynchronous in this Next.js version. Type it as a promise
  and await it before reading values.
- Public task references use readable `RMT-<number>` keys. UUIDs remain internal
  identifiers and must not replace task keys in navigation or shared URLs.

`useWorkspaceData` owns the live client workspace. Demo persistence,
realtime subscription setup, pure event reconciliation, and mutation behavior
have separate owners. Extend `workspace-realtime.ts`,
`workspace-reconciliation.ts`, or a domain mutation service instead of adding
unrelated behavior to the hook. Access-preview sessions intentionally do not
subscribe to realtime updates.

## Client feature boundaries

Keep page clients and top-level feature components focused on composition:

- `TaskApp` coordinates the workspace and selects board/list presentation.
  Board rendering belongs in `TaskBoardView`, list rendering in the list view,
  drag behavior in `useTaskBoardDrag`, and editor lifecycle in
  `useTaskEditorController`.
- Task drafts, scheduling, query parsing, filtering, view derivation, and
  mutation behavior belong in their named `lib/task-*` modules. Use pure
  helpers for rules that can be tested without React.
- Category and project screens may share neutral fields, links, attachment UI,
  and persistence machinery through `components/resources`, `lib/resource-*`,
  and `lib/server/resource-*`. Their distinct domain rules, permissions, copy,
  and state remain in their feature directories.
- Access screens compose panels and dialogs. Effective-permission derivation
  belongs in `access-selectors.ts`, client mutation coordination in
  `useAccessManagement`, and server workflows in the access-group operation and
  service modules.
- Search ranking/href generation, activity presentation, notes behavior, and
  workspace reconciliation belong in their framework-light domain modules,
  with UI components limited to interaction and rendering.

Do not extract code merely to reduce line count. Extract when a module gains a
clear owner, a reusable contract, or an independently testable rule. Avoid
generic `utils.ts`, `helpers.ts`, broad state bags, and full `WorkspaceData`
props when a component can receive a narrower view model or controller.

## Mutations and API contracts

- Browser writes go through same-origin API routes and the shared
  `mutate`/`parseMutationResponse` client helpers. Do not write protected
  workspace data directly from components.
- JSON mutation routes must use `readJson` and a schema from `lib/api-schema`
  or the deliberate `lib/api-schemas.ts` public surface. This preserves origin,
  content-type, body-size, unknown-key, and field validation.
- Route handlers must use `authorize` and return the shared structured API
  errors. Database failures go through `databaseFailure` so correlation IDs and
  safe error mapping remain consistent; do not expose raw Supabase errors.
- Multi-row or authorization-sensitive writes belong in transactional database
  functions. Call the canonical RPC rather than recreating a partial sequence
  of table writes in TypeScript.
- Client mutation services own optimistic updates and rollback. Apply returned
  canonical rows to workspace state so database normalization and triggers are
  reflected in the UI.
- File attachment routes use the shared resource attachment request, storage,
  and persistence modules. Preserve size/count enforcement and cleanup of
  partially completed storage/database operations.

## Authorization and data privacy

Read `docs/access-control-spec.md` before changing access groups, categories,
projects, tasks, attachments, membership, RLS, or privileged APIs. Its security
invariants are requirements, not implementation suggestions.

- Supabase RLS and database functions are the security boundary. UI filtering,
  hidden controls, access previews, and route-level checks are defense in depth,
  never substitutes for RLS.
- Authorization must fail closed. Missing grants, ownership metadata, or
  rollout state must deny access or block the migration; never broaden access.
- App ownership, organizational tiers, lateral teams, project grants, category
  restrictions, and projectless-task rules are distinct concepts. Reuse the
  canonical selectors and RPCs instead of approximating effective permission
  in a component.
- Owner-only access metadata must not be selected into regular-member payloads.
  Use the privileged server client only inside the established privileged API
  boundary and only after the corresponding authorization check.
- Preserve audit activity and transactional behavior when changing mutations.
  A successful content write must not silently lose its required audit record.
- Access preview is an owner-only diagnostic view, not impersonation and not an
  authorization mechanism.

## Database naming and migrations

The UI calls `work_groups` “categories.” Preserve that product terminology at
the UI/domain boundary and the existing table name at the database boundary;
do not introduce a second competing name casually.

Apply database changes directly to the linked project and verify the resulting
live objects. Put change SQL in a temporary file, preferably outside the
repository, and delete it after successful application and verification. If a
tool requires `supabase/migrations`, the file there is temporary and must be
removed before handoff. Do not commit migration files, register ephemeral files
with `supabase db push`, or make CI depend on reconstructing the production
schema locally. Keep database changes idempotent where practical and document
security-sensitive behavior in the access-control specification.

## Demo mode

Demo mode is a supported local product path, not test scaffolding. When a
workspace mutation is available in demo mode, keep its in-memory/local-storage
semantics aligned with the server-backed path, including normalized task
schedules, completion/archive lifecycle, relationships, and cleanup. Features
that cannot be safely simulated should be explicitly disabled with clear UI
rather than failing through an API call.

## UI conventions specific to Tasks

- Use the Inter variable font and established Tasks surfaces; Cooper remains
  reserved for intentional Ryan display moments inherited from the shared
  brand system.
- Reuse `@ryanmeetup/ui` fields, dialogs, menus, filters, feedback, toast, and
  loading primitives before adding Tasks-local equivalents.
- Preserve the light/dark theme bootstrap and CSP nonce. New inline scripts are
  exceptional and must be compatible with the nonce-based policy.
- The app is private and must remain `noindex` through metadata, `robots.ts`,
  and response headers.
- Search and filtering changes must follow the root debounced-search contract.
  Query parameters should be readable and stable, and owner access-preview
  parameters must survive relevant navigation and API requests.
- For optimistic or autosaved interactions, expose pending/error state and
  guard against stale responses overwriting a newer draft.

## Tests and validation

Put pure domain coverage in `tests/unit`, route contract coverage in
`tests/routes`, and browser behavior in `tests/e2e`. Every bug fix or extracted
rule should gain the narrowest useful regression test.

For Tasks changes, run from the repository root as applicable:

```sh
npm run lint --workspace=@ryanmeetup/tasks -- --no-cache
npx tsc --noEmit -p apps/tasks/tsconfig.json
npm test --workspace=@ryanmeetup/tasks
npm run test:e2e --workspace=@ryanmeetup/tasks
npm run build --workspace=@ryanmeetup/tasks
git diff --check
```

At minimum, lint changed TypeScript/TSX, run TypeScript, relevant unit tests,
and `git diff --check`. Add the production build for page, route, server,
configuration, or package changes; live verification for database/RLS/RPC
changes; and Playwright plus responsive visual checks for interaction or layout changes.
Report an environmental or pre-existing failure exactly rather than calling the
check successful.

## Page metadata titles

Every page must set an explicit absolute metadata title ending in
`| Ryan Meetup Tasks`. Do not rely on the root layout's `title.template`:
Next.js does not apply that template to a page in the same route segment, which
can produce inconsistent browser-tab titles.

Use this pattern for static pages:

```tsx
export const metadata: Metadata = {
  title: { absolute: "Dashboard | Ryan Meetup Tasks" },
};
```

Dynamic pages must use the same absolute-title shape from `generateMetadata`.
Task detail pages should use
`RMT-<number>: <task title> | Ryan Meetup Tasks`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
