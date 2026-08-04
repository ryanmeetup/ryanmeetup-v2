# Tasks App Staff Engineering Audit

**Date:** 2026-08-03  
**Scope:** `apps/tasks`, its Supabase migrations, and the shared packages it directly consumes  
**Method:** Static source review, migration/policy review, ESLint, production build attempt, and `npm audit --omit=dev`  
**Overall assessment:** **High risk. Do not expand access or treat the authorization model as production-safe until P0 is fixed and verified against the live database.**

## Executive summary

The app has one critical authorization design flaw, several high-severity dependency and data-integrity issues, no automated tests, a failing lint baseline, and an oversized client component that has become the de facto data layer, state manager, realtime coordinator, and UI shell.

The most urgent problem is not cosmetic or theoretical: access control deliberately falls back to granting every profile manager access to every project whenever the database is in an incomplete migration/configuration state. Creating one project without a group grant can put the entire application into that state. That is a fail-open authorization system and must be replaced with fail-closed behavior.

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
