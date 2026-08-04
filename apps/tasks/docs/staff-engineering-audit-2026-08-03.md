# Tasks App Staff Engineering Audit

**Date:** 2026-08-03  
**Scope:** `apps/tasks`, its Supabase migrations, and the shared packages it directly consumes  
**Method:** Static source review, migration/policy review, ESLint, production build attempt, and `npm audit --omit=dev`  
**Overall assessment:** **High risk. Do not expand access or treat the authorization model as production-safe until P0 is fixed and verified against the live database.**

## Executive summary

The app has one critical authorization design flaw, several high-severity dependency and data-integrity issues, no automated tests, a failing lint baseline, and an oversized client component that has become the de facto data layer, state manager, realtime coordinator, and UI shell.

The most urgent problem is not cosmetic or theoretical: access control deliberately falls back to granting every profile manager access to every project whenever the database is in an incomplete migration/configuration state. Creating one project without a group grant can put the entire application into that state. That is a fail-open authorization system and must be replaced with fail-closed behavior.

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
