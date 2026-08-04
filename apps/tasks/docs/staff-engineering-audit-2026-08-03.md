# Tasks App Staff Engineering Audit

**Date:** 2026-08-03  
**Scope:** `apps/tasks`, its Supabase migrations, and the shared packages it directly consumes  
**Method:** Static source review, migration/policy review, ESLint, production build attempt, and `npm audit --omit=dev`  
**Overall assessment:** **High risk. Do not expand access or treat the authorization model as production-safe until P0 is fixed and verified against the live database.**

## Executive summary

The app has one critical authorization design flaw, several high-severity dependency and data-integrity issues, no automated tests, a failing lint baseline, and an oversized client component that has become the de facto data layer, state manager, realtime coordinator, and UI shell.

The most urgent problem is not cosmetic or theoretical: access control deliberately falls back to granting every profile manager access to every project whenever the database is in an incomplete migration/configuration state. Creating one project without a group grant can put the entire application into that state. That is a fail-open authorization system and must be replaced with fail-closed behavior.

### Priority count

| Priority | Count | Meaning |
| --- | ---: | --- |
| P0 Critical | 1 | Immediate confidentiality/integrity risk |
| P1 High | 7 | Fix before broader production use |
| P2 Medium | 10 | Material reliability, maintainability, or defense-in-depth issue |
| P3 Low | 4 | Cleanup and consistency work |

## P0 — Critical

### P0-1. Project authorization globally fails open

**Evidence:**

- `supabase/migrations/20260813020000_group_only_project_access.sql:7-21` defines `access_control_enabled()` as a global readiness check. It returns false if *any* project lacks a group grant, if any task lacks a project, or if any attachment has a legacy path.
- The same migration at `:24-44` maps `not access_control_enabled() and is_team_member()` to the `manager` permission for every requested project.
- `supabase/migrations/20260801000000_task_tracker.sql:27-28` defines `is_team_member()` as the existence of a profile row. It does not require onboarding completion or active membership.
- `supabase/migrations/20260815000000_grant_new_projects_to_creator_groups.sql:12-24` grants a new project only to groups the creator already belongs to. An owner in zero groups creates a project with zero grants, which makes `access_control_enabled()` false and globally activates manager fallback.

**Impact:** One incomplete/legacy record or one normal edge-case project creation can grant every user with a profile read, edit, and delete capabilities across all projects and tasks. Because the permission helper is used by RLS, this is a database-enforced privilege escalation, not merely a UI leak.

**Required action:**

1. Remove the manager fallback from `project_permission_for`; absence of an explicit grant must return no permission.
2. Move rollout/backfill readiness out of runtime authorization. Migrations should fail deployment if backfill invariants are unmet.
3. Make project creation and its initial owner/group grant atomic. Reject creation if no valid grant can be established.
4. Redefine team membership to require the intended active/onboarded state.
5. Add database-level tests proving cross-project denial for viewer, editor, manager, unonboarded, removed, and zero-group users.
6. Verify the effective functions and policies in the live Supabase project; source migrations alone do not prove deployed state.

## P1 — High

### P1-1. Production dependency tree has three known high-severity vulnerabilities

**Evidence:** `npm audit --workspace=@ryanmeetup/tasks --omit=dev --json` reported high-severity findings in direct dependency `next` (through vulnerable `postcss` and `sharp` versions). The installed Next range is reported vulnerable through `16.3.0-preview.10`; fixes are available.

**Impact:** The reported transitive issues include arbitrary file/map disclosure in PostCSS and inherited libvips vulnerabilities in Sharp. Exploitability depends on how untrusted CSS/images reach build or image-processing paths, but leaving known high findings in the production tree is not acceptable.

**Required action:** Upgrade Next and lockfile-resolved transitive dependencies to patched releases, rerun the production audit, build, and image-processing smoke tests. Do not use `audit fix --force` without reviewing the resulting framework upgrade.

### P1-2. Attachment limits exist only in the browser; direct uploads are effectively unbounded

**Evidence:**

- `components/TaskDetails.tsx:203-209` enforces 10 MB only in client code.
- `supabase/migrations/20260802000000_task_details.sql:83` creates the private `task-attachments` bucket without `file_size_limit` or `allowed_mime_types`.
- Later storage policies restrict task access but do not add bucket-level size/type constraints.

**Impact:** Any authorized editor can bypass the UI and upload arbitrarily large or undesirable files directly through Supabase Storage, causing storage/cost abuse and unsafe file distribution. The displayed “10 MB maximum” is not a security control.

**Required action:** Configure bucket-side size and MIME allowlists in a migration, validate magic bytes where required, establish per-user/project quotas, and test direct API rejection.

### P1-3. Core task edits are non-transactional and routinely ignore database errors

**Evidence:**

- `components/TaskApp.tsx:767-822` updates a task, separately upserts an assignee, deletes all category links, reinserts category links, and then updates local state. Only the first update checks an error.
- `components/TaskApp.tsx:835-875` creates a task, then separately writes assignees and categories without checking those errors.
- `components/TaskDetails.tsx:96-158` optimistically inserts/toggles/deletes subtasks and comments while discarding all Supabase errors and providing no rollback.
- `components/TaskDetails.tsx:233-245` removes UI state first and ignores both Storage and row-delete failures.

**Impact:** The UI can report success while the database contains partial or contradictory state. A failed category reinsertion after the delete silently removes all categories. Realtime refresh can later make data appear to “revert,” creating user distrust and hard-to-reproduce corruption.

**Required action:** Move multi-table mutations into typed server endpoints/RPCs with transactions; check every result; update client state from the committed response; add rollback/error states for optimistic operations.

### P1-4. File uploads can orphan Storage objects

**Evidence:** `components/TaskDetails.tsx:174-200` uploads the object and creates a signed URL before inserting `task_attachments` at `:160-171`. If the row insert fails, the uploaded object is never removed. The reverse delete path also ignores failures.

**Impact:** Orphaned private objects accumulate, consume storage, and cannot be managed through the task UI.

**Required action:** Use a server-orchestrated upload finalization flow, clean up the object if metadata persistence fails, and add a scheduled orphan reconciliation job.

### P1-5. Privileged endpoints lack a shared hardened boundary

**Evidence:** `app/api/statuses/route.ts`, `app/api/work-groups/route.ts`, `app/api/team/route.ts`, and `app/api/profile/route.ts` each independently implement authentication, owner checks, service-role client creation, JSON parsing, validation, and error mapping. `request.json()` is unguarded; database/admin error strings are returned directly (for example `statuses/route.ts:67-68`, `team/route.ts:54-55`).

**Impact:** Security behavior can drift between routes; malformed JSON becomes an unstructured 500; internal database/auth details leak to clients; high-impact invite and account-deletion paths have no consistent request schema, audit event, origin/CSRF defense, or rate limit.

**Required action:** Introduce a server-only authorization/admin-client module, schema validation, safe error codes, request-size limits, explicit origin/CSRF policy for cookie-authenticated mutations, rate limiting for invite operations, and immutable audit logging for privileged actions.

### P1-6. There are no automated tests for permissions or core workflows

**Evidence:** No test/spec files or Jest/Vitest/Playwright configuration exist under `apps/tasks`; the package exposes only dev, build, start, and lint scripts.

**Impact:** The P0 authorization flaw, partial-write behavior, and access-preview logic can regress unnoticed. Migrations change the effective security model without executable acceptance criteria.

**Required action:** Start with Supabase/RLS integration tests, then API route tests and Playwright coverage for login/onboarding, task CRUD, project grants, role boundaries, attachments, and failure recovery. CI must block on these tests.

### P1-7. Project-owner metadata is writable across access boundaries

**Evidence:** `supabase/migrations/20260814000000_restore_project_owner_metadata.sql:5-8` grants `for all` access on `project_owners` to every `is_team_member()`. The policy does not check whether the caller can view or manage the referenced project, and `is_team_member()` is only a profile-existence check.

**Impact:** Any account with a profile, including an unonboarded or removed-but-not-deleted profile, can enumerate and alter owner metadata for projects it otherwise cannot access. The comment says this metadata is non-authoritative for access, but it is still cross-tenant/project integrity and information disclosure.

**Required action:** Restrict reads to `can_view_project(project_id)` and writes to `can_manage_project(project_id)` or owners, require valid eligible owner profiles, and test inaccessible-project denial. If only app owners should manage this metadata, encode that directly.

## P2 — Medium

### P2-1. `TaskApp.tsx` is a 2,807-line god component

**Evidence:** `components/TaskApp.tsx` owns server-derived workspace state, persistence, demo storage, realtime subscriptions, filtering, dialogs, task CRUD, drag/drop ordering, printing, access preview, status management, category management, and most board rendering.

**Impact:** Unrelated changes collide, effects capture large mutable state, logic cannot be tested independently, and permissions/business rules are embedded in presentation code.

**Required action:** Split by responsibility: `useWorkspaceData`, typed mutation service, realtime invalidation, task editor, board/list views, filter state, print/export, and status/category administration. Prefer server-owned mutation logic and small feature components; do not merely move 2,800 lines into one custom hook.

### P2-2. Realtime handling creates a database and Storage thundering herd

**Evidence:** `components/TaskApp.tsx:402-467` subscribes to every Postgres change in the public schema. Every event triggers 11 full-table queries and then one signed-URL request per attachment (`:433-443`). Task events also trigger a separate full task query at `:388-400`, so a task change can cause duplicate refreshes.

**Impact:** Work grows with total workspace size and connected users. One mutation can cause dozens/hundreds of requests, race overlapping refreshes, and exhaust Supabase quotas.

**Required action:** Subscribe only to relevant tables/events, apply row payload deltas where safe, batch/debounce invalidation, scope by accessible project, and use bulk signed URLs or on-demand signing.

### P2-3. Initial page loads silently convert query failures into empty datasets

**Evidence:** `app/page.tsx:56-120` destructures only `data` from 14 parallel queries and replaces null with empty arrays. Query errors are discarded. Similar patterns exist in the projects, categories, profile, and access pages.

**Impact:** Permission errors, schema drift, outages, and migration failures render as an apparently valid empty workspace. Users may take destructive actions based on incomplete data, and operations lose diagnostic signal.

**Required action:** Centralize workspace loading, inspect every result, fail with a typed error boundary, log a correlation ID server-side, and distinguish “no records” from “could not load records.”

### P2-4. The app mixes direct browser-to-database mutations with API mutations

**Evidence:** Tasks, task details, access groups, memberships, and grants write directly through the browser Supabase client, while statuses, categories, projects, profiles, and team accounts use API routes.

**Impact:** Validation, audit logging, transactions, observability, rate limiting, and error contracts vary by feature. The browser also constructs authoritative IDs, timestamps, actors, and activity text.

**Required action:** Define one mutation architecture. Keep RLS as the final security boundary, but route business operations through typed server functions/RPCs that own validation, transactions, audit events, and returned canonical records.

### P2-5. Status reordering is race-prone and non-atomic

**Evidence:** `app/api/statuses/route.ts:88-116` reads all statuses and then upserts the reordered rows as a separate operation. Concurrent requests can pass the same list check and overwrite each other; partial failure semantics depend on the client/upsert behavior rather than an explicit transaction.

**Impact:** Concurrent admins can lose ordering changes or produce duplicate/incorrect positions.

**Required action:** Implement a single transactional RPC with a version/revision check and unique ordering invariant.

### P2-6. Production builds depend on live Google Fonts access

**Evidence:** `npm run build:tasks` failed because `next/font` could not fetch Inter from `fonts.googleapis.com` during the build.

**Impact:** Builds are non-hermetic and can fail due to external network policy or provider availability.

**Required action:** Use the existing shared/local brand font assets or vendor Inter locally through `next/font/local`. Confirm licensing and eliminate build-time network fetches.

### P2-7. The lint baseline is failing

**Evidence:** `npm run lint --workspace=@ryanmeetup/tasks` fails at `components/ThemeProvider.tsx:46` (`react-hooks/set-state-in-effect`).

**Impact:** CI cannot use lint as a trustworthy gate; new issues can hide behind a known failure.

**Required action:** Initialize theme without a synchronous effect state update (and prevent first-paint theme flash), then make lint blocking in CI.

### P2-8. Security headers are incomplete

**Evidence:** `next.config.ts:9-21` sets only `X-Robots-Tag`. There is no repository-defined CSP, `frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`, or explicit content-type/frame protection.

**Impact:** The app lacks normal browser defense in depth against injection impact, framing/clickjacking, referrer leakage, and unnecessary browser capabilities. Hosting defaults should not be assumed.

**Required action:** Add and test a restrictive CSP and standard headers. Account for Supabase endpoints and any required image/storage origins. Prefer CSP `frame-ancestors` over legacy-only controls.

### P2-9. The callback and invite URL are hard-coded to production

**Evidence:** `lib/app-url.ts:1-5` always uses `https://tasks.ryanmeetup.com`; `app/auth/callback/route.ts` and `app/api/team/route.ts:51` use it for redirects.

**Impact:** Local, preview, and staging authentication/recovery flows redirect into production. This complicates testing and can mix environments or sessions.

**Required action:** Use an allowlisted, environment-specific canonical origin; validate forwarded/request origins only when the deployment platform is trusted. Keep production as an explicit production value, not a universal constant.

### P2-10. Unbounded reads load the entire workspace into every client

**Evidence:** `app/page.tsx:71-92` loads all accessible tasks, comments, activity, attachments, profiles, and relationship tables with `select("*")`, then serializes them into the client component. Realtime repeats the same pattern.

**Impact:** Initial payload, memory, query time, and browser computation grow indefinitely. Historical comments/activity and archived tasks are paid for on every page load.

**Required action:** Paginate tasks and activity, fetch task details on demand, select explicit columns, separate archived data, and introduce server-side filtering/counts.

## P3 — Low

### P3-1. Duplicate and misleading data-model concepts remain

**Evidence:** `app/page.tsx:74-75` queries `work_groups` twice, assigning one result to `workGroups` and another to `categories`. Other pages populate either `categories` or `workGroups` and leave the other empty. The UI and APIs alternate between “category” and “work group.”

**Impact:** This is unnecessary I/O and a strong signal of model drift. Future code can use the wrong collection while still type-checking.

**Required action:** Choose one domain term, migrate types/props/UI copy consistently, and query the table once.

### P3-2. Shared server utilities and validators are needlessly duplicated

**Evidence:** Owner authorization, service-role client creation, color validation, response handling, and workspace-shaped empty arrays recur across routes/pages. The app also manually constructs `WorkspaceData` in several server pages.

**Impact:** DRY violations create security and behavior drift, as already visible in different 401/403/404/503 handling and credential error text.

**Required action:** Consolidate server-only auth/client utilities, request schemas, result/error helpers, and focused page loaders. Avoid one generic “utils” dumping ground.

### P3-3. Server/database error messages are used as user-facing copy

**Evidence:** Multiple API routes return `error.message`; client components commonly toast the returned message directly.

**Impact:** Users see unstable technical text and internal constraint/schema details; localization and consistent remediation guidance are impossible.

**Required action:** Map expected failures to stable codes and friendly copy; log full errors server-side with request IDs.

### P3-4. Documentation promises a cleaner permission model than the code implements

**Evidence:** `docs/access-control-spec.md` describes group-based access, while runtime SQL contains the global manager fallback described in P0.

**Impact:** Reviewers and operators can believe the app is deny-by-default when it is not.

**Required action:** Update the spec alongside the fail-closed migration and add explicit invariants: no implicit grants, no rollout bypass in authorization, and no project without an initial owner/group grant.

## Consolidation targets

These are the highest-value boundaries to extract; consolidation should follow behavior, not file size alone.

1. **Server authorization layer:** `requireUser`, `requireOnboardedUser`, `requireOwner`, server/admin Supabase clients, safe API errors.
2. **Workspace query layer:** explicit-column loaders with error handling and route-specific projections instead of repeated `WorkspaceData` assembly.
3. **Task mutation service:** transactional create/update/delete, assignees, categories, lifecycle timestamps, and activity logging.
4. **Attachment service:** upload authorization/finalization, limits, metadata transaction/cleanup, signing, deletion, and orphan reconciliation.
5. **Realtime layer:** scoped subscriptions and query invalidation/delta application.
6. **`TaskApp` feature components:** board/list rendering, editor, filters, print/export, status administration, and work-group administration.

## Recommended remediation order

### First 24 hours

1. Disable or gate broader access until the live RLS state is verified.
2. Ship a fail-closed authorization migration and atomically enforce initial project grants.
3. Add a live-database regression script covering unauthorized cross-project read/write/delete.
4. Upgrade the vulnerable production dependency chain.

### First week

1. Enforce attachment controls at Storage/database boundaries.
2. Transactionalize task create/update and stop ignoring mutation errors.
3. Add RLS/API integration tests and make lint/test/audit checks blocking.
4. Centralize privileged route authorization, validation, errors, and auditing.

### Next iteration

1. Break apart `TaskApp` along the boundaries above.
2. Replace full-workspace realtime reloads with scoped invalidation/deltas.
3. Paginate/lazy-load workspace detail data.
4. Make fonts/builds hermetic and add security headers.
5. Normalize “category” versus “work group” naming and remove duplicate queries.

## Validation record

- **ESLint:** Failed — `components/ThemeProvider.tsx:46`, `react-hooks/set-state-in-effect`.
- **Production build:** Failed — build-time Google Fonts fetch for Inter could not reach `fonts.googleapis.com`. No source compilation result should be inferred beyond that failure.
- **Production dependency audit:** Completed with registry access — 3 high vulnerabilities, 0 critical, fixes available.
- **Automated tests:** None found, so none could be run.
- **Live Supabase policy verification:** Not performed. The P0 finding is proven in source SQL, but deployed policy/function state must be checked separately.
- **Worktree safety:** Existing user edits in `app/globals.css`, `components/TaskApp.tsx`, and `components/TasksSidebar.tsx` were not modified.
