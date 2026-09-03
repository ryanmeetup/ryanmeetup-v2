# Mobile editor surfaces

Audit date: 2026-09-03
Status: Tier 1 shipped. Tier 2 and the open questions below are not started.

Every create/edit flow in the Tasks app was a `Modal`. On a phone the shared
dialog caps itself at `max-h-[min(42rem, 100dvh − safe-area insets)]`, pads the
body with `p-6`, and keeps a `shrink-0` header and footer. Nothing overflows —
`Modal` has always handled `dvh` sizing, safe-area insets, an internal scroll
container, and a "Scroll for more" affordance — but on a 390×844 screen with a
stacked footer and the virtual keyboard raised, the largest editors were left
with under 200px of usable form area.

The fix is not a bigger dialog. The largest editors are laid out as two columns
(`lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]` in
`components/resources/ExpandableResourceEditor.tsx`) and widen from `lg` to
`2xl` when their supporting details expand. Below `lg` that grid collapses to a
single column, so on a phone the expand gesture buys nothing and only doubles
the scroll length inside a fixed-height box.

## What shipped: the Tier 1 editors

The five heaviest editors now have a dedicated mobile route. Desktop is
unchanged and still opens a dialog.

| Editor | Mobile route | Dialog it replaces |
| --- | --- | --- |
| Task | `/task/new`, `/task/[key]/edit` | `TaskEditor` |
| Project | `/projects/new`, `/projects/[id]/edit` | `ProjectsModal` |
| Category | `/categories/new`, `/categories/[id]/edit` | `CategoriesModal` |
| Contact | `/contacts/new`, `/contacts/[id]/edit` | `ContactEditor` |
| Calendar event | `/calendar/event/new`, `/calendar/event/[id]/edit` | `CalendarEventEditorModal` |

### How it works

`Modal`'s chrome — header, scrolling body with its two scroll shadows, and the
footer that holds `supportingActions` on the left and `ModalActions` on the
right — was extracted into `EditorChrome` in `@ryanmeetup/ui`. `Modal` renders
it inside the dialog card exactly as before; the new `EditorPage` renders the
same chrome as a full-height page column with a sticky action bar. Because both
surfaces take the same `formId`/`onSubmit` contract, **the editor form bodies
did not change at all** — each editor gained a `presentation` prop that picks
the surface, and nothing else.

Two rules keep this from turning into two divergent editors:

- **The form body never knows which surface it is in.** If a field needs to
  know, that is a layout concern and belongs in the surface, not the field.
- **The breakpoint is CSS, never JavaScript.** Triggers render an anchor that
  is visible below `sm` and a button that is visible from `sm` up, both always
  mounted. There is no `matchMedia` in the routing decision, so there is no
  hydration mismatch and no flash of the wrong surface.

### Why the trigger pairs live where they do

The create affordances funnel through very few files even though ~9 page
clients pass `onCreateCategory`/`onCreateProject` down. `TasksSidebar` owns the
sidebar's create buttons and `WorkspacePageShell` owns the global new-task
button, so the mobile link/desktop button pair is written once in each rather
than at every call site. Per-row edit affordances are the exception and are
paired individually on the management cards.

## Tier 2: worth doing, not yet done

Ranked by how much a phone user suffers today.

### 1. Note editor — `components/notes/NoteModal.tsx` (215 lines, size `lg`)

The worst remaining ratio. A `RichTextarea`, `NoteLinks`, and
`components/notes/NoteComments.tsx` (276 lines) all share one capped dialog,
and `NoteComments` runs its own `matchMedia` at 768px inside it. A comment
thread nested in a scrolling dialog on a phone is the case a user will report
first. There is no `/notes/[id]` route yet, so this needs a route as well as a
surface — which makes it the largest of the remaining items, and the one whose
payoff is clearest.

### 2. Access group create/edit — `components/access/`

`CreateAccessGroupModal.tsx` (164 lines, 7 controls) and
`EditAccessGroupModal.tsx` (191 lines, size `lg`). This is the cheapest fix in
the audit: `/admin/access/[slug]` **already exists** as a real page, so the edit
dialog needs a mobile link to a route that is already built rather than a new
route. Do this one first if the goal is visible progress for little work.

### 3. Digest settings — `components/usage/`

`DigestCadenceModal.tsx` (258 lines, 6 controls) and
`DigestStructureModal.tsx` (241 lines). The structure editor reorders a list
with paired `IconButton` arrows, which are small targets for a thumb no matter
what contains them. That is worth fixing on its own terms — a drag handle or
larger touch targets — independent of the surface question.

### 4. Read-only detail dialogs

`components/usage/EmailDetailModal.tsx` (244 lines, size `xl`) and
`components/calendar/GoogleEventModal.tsx` (479 lines, size `lg`). Both render
long content in a capped box, but both are read-only, so there is no draft to
lose and no keyboard competing for height. `EditorPage` would work for them
unchanged; they are last because the cost of the status quo is only scrolling.

## Deliberately left as modals

These are the right size for a dialog and should stay one. Listed so the next
pass does not re-audit them:

`StatusCreateModal`, `StatusReasonDialog`, `ProfileAccessModal`, `TeamDialogs`,
the four admin settings modals (`Banner`, `Email`, `Identity`, `LinkPreview`),
`ResourceAttachmentsPreview` (an image viewer, and correctly the one dialog
that opts into `dismissOnOutsideClick`), the two `CalendarPageClient`
day-agenda list dialogs, and every `ConfirmationDialog`.

The admin settings modals are small specifically because that form was split
per concern instead of being kept as one page-wide save. Do not undo that by
recombining them onto a page.

## Open questions

- **Draft continuity across the surface switch.** `useTaskEditorController`
  autosaves a task draft to local storage, so a task survives the jump from a
  half-filled dialog to the route. No other editor has an equivalent. If a
  future change lets a viewport change swap surfaces mid-edit, every Tier 1
  editor needs that autosave, not just tasks.
- **One breakpoint, three definitions.** `TaskWorkspaceHeader` and
  `NoteComments` use 768px, `LatestChangelogCard` uses 1024px, and
  `ContactsPageClient` uses both 768px and 1536px — all through separate
  `matchMedia` calls. The mobile editor routes deliberately avoid JavaScript
  entirely, so they did not force this cleanup, but a shared hook is still owed
  if any of that logic grows.
- **`GoogleCalendarControls` opens a dialog from a dialog.** Not a size problem,
  but stacked dialogs on a phone are disorienting. Worth revisiting if the
  calendar integration grows.
