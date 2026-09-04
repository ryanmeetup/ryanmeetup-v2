/**
 * The dedicated mobile editor routes, and the CSS that decides when they are
 * used. See `docs/MOBILE_EDITOR_SURFACES.md`.
 *
 * The five heaviest editors — task, project, category, contact, and calendar
 * event — are dialogs on desktop and pages on a phone. The choice is made in
 * CSS, never in JavaScript: a trigger renders both an anchor to the route and a
 * button that opens the dialog, and the breakpoint hides one of them. Both are
 * always mounted, so there is no hydration branch, no `matchMedia`, and no
 * flash of the wrong surface before the client decides.
 *
 * Pair these two on the same trigger, always. A control that is only ever
 * `mobileEditorTrigger` leaves desktop with no way in.
 *
 * The desktop half hides with `max-sm:hidden` rather than a plain `hidden`.
 * Tailwind v4 emits the display utilities in alphabetical order, so `.hidden`
 * is written before `.inline-flex` and loses to it at equal specificity -- and
 * `Button`, `Button.Link`, and `IconButton` all carry `inline-flex` in their
 * base classes, so a plain `hidden` on one of those never took effect and a
 * phone showed the route trigger and the dialog trigger side by side. A
 * media-query variant is emitted after the unprefixed utilities and wins
 * whatever display the component asks for.
 */
export const mobileEditorTrigger = "sm:hidden";
export const desktopEditorTrigger = "max-sm:hidden sm:inline-flex";

/**
 * The workspace shell padding an editor route passes as `contentClassName`.
 * Edge to edge on a phone, where the form should own the whole viewport, and a
 * centred column from `sm` up so the route stays usable if someone opens the
 * link on a desktop.
 */
export const editorPageContentClassName =
  "mx-auto flex w-full min-w-0 max-w-3xl flex-col sm:p-6 lg:p-8";

/** The wider column for editors whose supporting details sit beside the form. */
export const wideEditorPageContentClassName =
  "mx-auto flex w-full min-w-0 max-w-5xl flex-col sm:p-6 lg:p-8";
