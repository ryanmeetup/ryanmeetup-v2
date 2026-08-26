/**
 * Demo preview lets an app owner of a configured deployment see the workspace
 * exactly as a zero-configuration demo build renders it — fixture data, neutral
 * branding, the demo banner, no admin section — without deploying a second
 * build with the Supabase variables removed.
 *
 * It is the same idea as the owner access preview: a deliberate, reversible
 * look at somebody else's view of the app, never an authorization mechanism.
 * The flag rides in a cookie rather than a query parameter because demo mode
 * replaces the entire workspace — the root layout, the branding, and every
 * route's data source — so it has to survive navigation the app does not
 * thread a parameter through.
 */
export const DEMO_PREVIEW_COOKIE = "tasks-demo-preview";

/** The only value the server accepts; anything else reads as "off". */
export const DEMO_PREVIEW_VALUE = "on";

/** Long enough to look around, short enough that a forgotten preview lapses. */
export const DEMO_PREVIEW_MAX_AGE_SECONDS = 4 * 60 * 60;

export const DEMO_PREVIEW_ENDPOINT = "/api/admin/demo-preview";
