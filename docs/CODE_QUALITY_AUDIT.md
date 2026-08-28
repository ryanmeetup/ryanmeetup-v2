# Code Quality Audit

Date: August 27, 2026

## Purpose and scope

This document records a staff-level frontend audit of the full Ryan Meetup
monorepo. The review covered approximately 80,000 tracked lines of TypeScript
and TSX across:

- `apps/ryanmeetup`
- `apps/ryancon`
- `apps/store`
- `apps/tasks`
- the shared packages under `packages/`

The audit focused on correctness risks, code smells, DRY violations,
maintainability, React and Next.js patterns, package boundaries, test ownership,
and code that is unnecessarily difficult for a human to understand. It did not
make implementation changes.

## Executive summary

The monorepo has a sound overall direction. Package ownership is clearer than
in most repositories of this size, shared UI adoption is growing, and the Tasks
application has strong unit coverage and deliberate API error handling.

The primary risks are concentrated in a few areas:

1. CMS-backed JSON-LD is serialized into script elements without escaping `<`,
   creating a latent script-injection boundary.
2. The Tasks list endpoint duplicates its filter pipeline and the copies have
   already drifted, producing different search behavior during page correction.
3. The Ryan Meetup Bryan gate has two competing owners for one local-storage
   value and can render inconsistently during hydration.
4. Contentful data loses its type guarantees at the application boundary and
   is recovered through assertions throughout the component tree.
5. Several server pages serialize independent CMS requests instead of running
   them concurrently.
6. A small set of very large client components own too many state, network, and
   rendering responsibilities.
7. CI and test ownership are materially weaker outside the Tasks application.

The recommended order of work is:

1. Secure JSON-LD serialization.
2. Remove the duplicate Tasks query pipeline and add regression coverage.
3. Consolidate the Bryan local-storage state.
4. Restore reliable Ryan Meetup, RyanCon, and Store CI.
5. Introduce typed and validated Contentful adapters.
6. Split the largest client controllers along domain boundaries.
7. Address lower-risk readability and dependency hygiene issues.

## Findings

### 1. High: CMS-backed JSON-LD is not safely serialized

Several pages insert CMS-controlled values into a `<script>` element using raw
`JSON.stringify` and `dangerouslySetInnerHTML`:

- `apps/ryanmeetup/app/page.tsx:126`
- `apps/ryanmeetup/app/events/page.tsx:84`
- `apps/ryanmeetup/app/press/page.tsx:68`
- `apps/ryanmeetup/app/chapters/page.tsx:79`

The data includes FAQ answers, event descriptions, article metadata, chapter
names, and other Contentful fields. A value containing `</script>` can terminate
the JSON-LD script element even though the value is valid JSON. This makes a
mistaken or compromised CMS entry a script-injection boundary.

The Store already demonstrates the expected protection in
`apps/store/app/products/[handle]/page.tsx:50` by replacing `<` with its Unicode
escape before inserting the JSON.

#### Recommendation

Add a single shared helper, for example:

```ts
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
```

Use that helper for every JSON-LD script. Add a unit test containing a value
such as `</script><script>alert(1)</script>` to prevent regressions.

### 2. High: the Tasks list query is duplicated and behavior has drifted

`apps/tasks/app/api/tasks/route.ts` constructs the normal filtered query around
line 150. When the requested page is outside the available range, it rebuilds
the query from scratch around line 254 before requesting the corrected page.

This is a large DRY violation covering:

- archive visibility;
- access previews;
- exact include and exclude filters;
- due-date filters;
- category filters;
- tag filters;
- search;
- sorting.

The two copies already have different semantics. The primary query builds a
search around lines 220–231 that includes:

- title;
- description;
- parsed task number;
- matching project IDs.

The correction query around lines 334–337 searches only title and description.
An out-of-range request searching by task key or project can therefore correct
the page using a different result set from the original request.

The secondary category, assignee, and label lookups around lines 355–375 also
return partial arrays without checking their individual errors.

#### Recommendation

Extract a single query builder, such as `applyTaskListFilters(query, context)`,
and call it for both the counted query and corrected range query. Keep search
construction in one typed value rather than rebuilding a string in two places.

Add GET-route regression tests for:

- out-of-range page correction;
- task-key search during correction;
- project-name search during correction;
- category and tag filters during correction;
- failures in related-row lookups.

### 3. High: the Bryan gate has conflicting state ownership and hydration risk

One local-storage flag is managed through two different hooks:

- `apps/ryanmeetup/hooks/useBryanChecker.tsx:3` initializes the value to `false`
  and reads storage in an effect after mount.
- `apps/ryanmeetup/hooks/useLocalStorage.tsx:3` returns no explicit fallback on
  the server but reads storage during the first browser render.
- `apps/ryanmeetup/components/global/BryanChecker.tsx:10` uses the first hook.
- `apps/ryanmeetup/components/global/BryanModal.tsx:17` uses the second hook.

Consequences include:

- the blocking modal may briefly mount for a returning visitor;
- server and first-client values can disagree;
- the checkbox may initially receive `undefined` instead of a boolean;
- malformed JSON in storage can throw;
- storage behavior is harder to reason about because reads and writes have
  different owners.

#### Recommendation

Replace both hooks with one SSR-safe store. `useSyncExternalStore` is a good fit
because it can provide an explicit server snapshot, subscribe to `storage`
events, validate parsed values, and centralize writes.

The parent gate should be the sole owner of the value and pass `checked` and
`onCheckedChange` to the modal.

### 4. Medium: the Contentful boundary effectively opts out of TypeScript

`apps/ryanmeetup/actions/fetchContent.ts` returns raw `entry.fields` values and
uses repeated `@ts-ignore` comments for ordered queries. Callers then restore
types through assertions, for example in `apps/ryanmeetup/app/page.tsx:56`.

The handwritten models in `apps/ryanmeetup/lib/types.ts` also mix values such as
`Date | string` even though Contentful data arrives over JSON as strings. This
creates assertions such as `as unknown as RyanEvent[]` throughout pages and
components.

Type assertions do not validate CMS data. Missing or changed fields can still
reach rendering code and fail at runtime.

The Contentful environment variables are similarly asserted with `as string`
instead of being validated once with a useful startup error.

#### Recommendation

Create typed CMS adapters that:

1. use Contentful entry skeleton types or generated types;
2. validate environment configuration once;
3. validate and normalize entry fields at the boundary;
4. return application domain types with consistent date and image shapes;
5. attach the Contentful entry ID when it is the stable row identity.

Components should never need to know that their data came from Contentful or
use `as unknown as` to consume it.

### 5. Medium: server pages contain avoidable CMS request waterfalls

Several server-rendered pages await independent data sequentially:

- The homepage performs seven sequential calls in
  `apps/ryanmeetup/app/page.tsx:55`.
- Chapters performs three in
  `apps/ryanmeetup/app/chapters/page.tsx:55`.
- Awards performs four in
  `apps/ryanmeetup/app/awards/page.tsx:60`.
- Press performs two in
  `apps/ryanmeetup/app/press/page.tsx:64`.

The `unstable_cache` wrappers reduce normal latency, but a cold cache still pays
the sum of every independent network round trip.

#### Recommendation

Use `Promise.all` for independent reads. Preserve conditional E2E fixtures by
building the promise list after fixture selection rather than serializing the
production calls.

### 6. Medium: several client components own too many responsibilities

The largest frontend hotspots are:

| File | Approximate size | Responsibilities mixed together |
| --- | ---: | --- |
| `apps/tasks/components/calendar/CalendarPageClient.tsx` | 1,540 lines | Workspace state, month navigation, recurrence, Google loading and publishing, CRUD, filters, local storage, responsive calendar rendering, and multiple dialogs |
| `apps/tasks/components/categories/CategoriesModal.tsx` | 1,250 lines | Create/edit state, access rules, owners, tags, colors, links, attachments, archive/delete, search, and complete modal rendering |
| `apps/tasks/components/projects/ProjectsModal.tsx` | 1,086 lines | Create/edit state, access rules, owners, favorites, attachments, archive/delete, search, and rendering |
| `apps/tasks/components/access/AccessPageClient.tsx` | 836 lines | Invitations, profile removal, group CRUD, membership, sorting, pagination, responsive team views, previews, and many dialogs |

File length alone is not the problem. These files combine state machines,
network orchestration, normalization, optimistic updates, and several visual
subtrees. That makes behavior difficult to test without rendering an entire
page and makes small edits risky.

Projects and Categories are particularly prone to drift. They implement
parallel owner, access, archive, attachment, create, and edit workflows but use
different amounts of shared state infrastructure.

#### Recommendation

Extract domain-specific controllers and focused views rather than a universal
generic manager:

- `useCalendarController`
- `useGoogleCalendarSync`
- `CalendarGrid`
- `CalendarAgenda`
- `CalendarSettingsDialog`
- `useResourceAccessEditor`
- `ResourceCreateForm`
- `ResourceEditForm`
- `AccessTeamTable`
- `AccessGroupController`

Keep project-only and category-only business rules in their own domain layers.

### 7. Medium: `FloatingCta` duplicates most of its render tree

`apps/ryanmeetup/components/global/FloatingCta.tsx` contains one large rendering
branch around lines 118–225 for linked details and a second near-copy around
lines 227–311 for non-linked details.

The duplicated sections include the visual shell, icon, heading, descriptions,
detail rows, typography, colors, and responsive behavior. Styling or
accessibility changes must be kept synchronized by hand.

#### Recommendation

Build the card body once, then vary only the semantic wrapper:

- use a link wrapper when the whole card navigates;
- use a `div` wrapper when details contain their own links;
- keep the dismiss control outside both wrappers.

### 8. Medium: CI and test ownership are weak outside Tasks

`.github/workflows/tasks-tests.yml` is the only application test workflow. It
validates Tasks on relevant pull requests and pushes, but there is no equivalent
gate for Ryan Meetup, RyanCon, or Store.

The repository currently tracks generated Playwright output under
`apps/ryanmeetup/test-results`. Its `.last-run.json` records six failed tests.
The failures include stale redirect destinations and an ambiguous text locator
in `apps/ryanmeetup/tests/pages.spec.ts`.

Tracking the generated output creates noise and means running a test can dirty
the worktree. It does not replace a reliable CI signal.

Pure utility tests in `apps/ryanmeetup/tests/utils` also run through Playwright,
which starts a Next server even though those tests do not require a browser.

#### Recommendation

1. Add `test-results/` and Playwright reports to `.gitignore`.
2. Remove generated results from version control.
3. Add CI workflows for Ryan Meetup, RyanCon, and Store.
4. Move pure utility tests to a lightweight unit runner.
5. Keep redirect destinations in one source consumed by both Next configuration
   and tests.
6. Prefer semantic, unique locators such as `getByRole("heading", ...)` over
   ambiguous `getByText` queries.

### 9. Medium: feature components import their own barrels

Several components import a directory barrel that re-exports the importing
component itself:

- `apps/ryanmeetup/components/global/BryanChecker.tsx:4`
- `apps/ryanmeetup/components/events/EventsSection.tsx:4`
- `apps/ryanmeetup/components/navigation/Header.tsx:5`
- `apps/ryanmeetup/components/awards/Leaderboard.tsx:8`
- `apps/ryanmeetup/components/map/Map.tsx:9`

For example, `EventsSection` imports `@/components/events`, while
`components/events/index.ts` re-exports `EventsSection`. These circular module
graphs obscure dependency direction and can accidentally pull extra client
modules across a React Server Component boundary.

#### Recommendation

Within a feature directory, import siblings directly, such as
`./EventsSectionHeader`. Reserve the feature barrel for consumers outside that
directory.

### 10. Low: layout class construction contains malformed residue

`apps/ryanmeetup/components/navigation/Layout.tsx:46` starts its class string
with `${className}f`. This emits either an accidental trailing `f` or a class
such as `undefinedf`.

The Ryan Meetup and RyanCon layouts also:

- interpolate optional values directly into strings;
- repeat the same layout shell;
- contain likely-invalid `from-neutral-00` utilities;
- use a constant string inside a template expression in RyanCon;
- combine mutually competing background utilities in a way that is hard to
  review.

#### Recommendation

Use `clsx` or the shared class-name helper and extract a small shared site-frame
primitive. Keep app-specific banners, floating actions, and footer content as
props or app-owned composition.

### 11. Low: dependency and dead-code hygiene is loose

`apps/ryanmeetup/package.json` declares dependencies that do not appear to be
imported by application code:

- `@emotion/react`
- `@tanstack/react-query`
- `swiper`
- `@mailerlite/mailerlite-nodejs`

The app manifests also carry slightly different versions of shared libraries,
including Next.js, Headless UI, React Icons, React Hook Form, and React Hot
Toast. Some divergence can be intentional, but unexplained version drift makes
workspace behavior and lockfile resolution harder to reason about.

`packages/utils/src/convert.ts` exports unused date helpers. In particular,
`convertShortDate` adds one to the calendar day without a comment or test. An
unused surprising helper should not remain part of a public package API.

#### Recommendation

Remove unused dependencies and exports, document intentional version
differences, and add tests before retaining any non-obvious conversion helper.

### 12. Low: stable CMS identities are replaced with array indexes

Index keys appear in lists whose contents can be sorted or filtered, including:

- `apps/ryanmeetup/components/events/EventsSection.tsx:44`
- `apps/ryanmeetup/components/events/DoubleHeader.tsx:21`
- `apps/ryanmeetup/components/chapters/ChapterDirectory.tsx:208`
- `apps/ryanmeetup/components/home/FAQ.tsx:73`
- `apps/ryanmeetup/app/awards/page.tsx:107`

Using indexes can cause React to associate local state or DOM identity with the
wrong item after reordering.

#### Recommendation

Use the Contentful entry ID whenever possible. Otherwise use a stable slug,
href, or documented composite key. Supplying stable IDs becomes easier once the
CMS adapter preserves `entry.sys.id` consistently.

## Additional observations

### Hidden global behavior in `useQueryParamState`

`packages/hooks/src/useQueryParamState.ts` patches `window.history.pushState`
and `window.history.replaceState` globally. The implementation is guarded and
preserves the native behavior, but consumers cannot tell from the hook API that
mounting it changes global history methods for the rest of the page.

This is not currently classified as a defect, but it deserves explicit tests
for multiple subscribers, hot reload, back/forward navigation, and coexistence
with the Next.js router. A module-level comment should document why the global
patch is preferred over router-driven URL updates.

### Repeated search callback allocation

Some `useSearchFilter` consumers pass an inline `buildHaystack` function. Since
the hook includes that function in its `useMemo` dependencies, those consumers
recompute their filtered array on every render. This is unlikely to be the
largest performance cost today, but callers with large datasets should provide
a stable module-level function or the hook should document that expectation.

### Shared-package tests

The shared UI, hooks, contact, sponsors, and utility packages do not own a
package-level test suite. Some behavior is covered indirectly through Tasks or
Playwright, but critical shared logic such as rich-text conversion,
query-parameter synchronization, and contact topic resolution would benefit
from direct tests.

## Strengths worth preserving

- The repository documents package ownership and design expectations clearly
  in `AGENTS.md`.
- Shared UI, contact, sponsor, hooks, and utility packages have sensible
  intended boundaries.
- Tasks has strong request validation and centralized API error responses.
- Tasks unit tests are broad and fast.
- Recent task-workspace changes move orchestration into focused hooks rather
  than continuing to grow `TaskApp` and `TaskDetails`.
- Newer UI code consistently considers dark mode, focus visibility, disabled
  behavior, loading feedback, and responsive layouts.
- CMS location pagination is handled deliberately rather than silently relying
  on Contentful's default page size.
- Rich-text HTML generation escapes user text before applying its limited
  inline markup transformations.

## Proposed remediation plan

### Phase 1: correctness and trust boundaries

1. Add and adopt `serializeJsonLd`.
2. Extract the Tasks list query filter builder.
3. Add GET-route tests covering corrected pagination and related-query errors.
4. Replace the two Bryan storage hooks with one SSR-safe source of truth.

### Phase 2: restore reliable feedback loops

1. Remove tracked Playwright output and ignore generated reports.
2. Repair the stale Ryan Meetup browser expectations.
3. Add CI for Ryan Meetup, RyanCon, and Store.
4. Move pure utility tests to a unit runner.
5. Add package-level tests for shared hooks, rich text, and utilities.

### Phase 3: strengthen data contracts and rendering performance

1. Validate Contentful environment configuration.
2. Introduce typed Contentful entry skeletons and normalized domain adapters.
3. Remove downstream `as unknown as` assertions.
4. Parallelize independent CMS reads with `Promise.all`.
5. Add pagination to Contentful collections that can exceed the default limit.

### Phase 4: reduce state-machine complexity

1. Split the calendar controller from calendar views and dialogs.
2. Consolidate shared project and category access-editing behavior.
3. Split access-team orchestration from its responsive views and dialogs.
4. Remove the duplicated `FloatingCta` render tree.
5. Prefer focused, domain-named hooks over a single generic resource manager.

### Phase 5: readability and hygiene

1. Replace feature-internal barrel imports with direct sibling imports.
2. Consolidate and clean the Ryan Meetup and RyanCon layout shells.
3. Replace index keys with stable identities.
4. Remove dead hooks, utilities, commented code, and unused dependencies.
5. Align shared dependency versions unless divergence is documented.

## Validation baseline

At the time of this audit:

- ESLint passed for Ryan Meetup, RyanCon, Store, and Tasks.
- Tasks passed 61 test files and 387 tests.
- `git diff --check` passed.
- The worktree was clean before this document was added.
- The existing tracked Ryan Meetup Playwright result reported six failures; the
  browser suite was not rerun during the audit because running it would rewrite
  tracked generated artifacts.

Passing lint and unit tests should not be interpreted as disproving the
findings above. Several findings are architectural risks, untested edge paths,
or behavior outside the current CI coverage.
