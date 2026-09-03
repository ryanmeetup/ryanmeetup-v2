import { redirect } from "next/navigation";
import {
  ACCESS_PREVIEW_PARAM,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access/access-preview";

/**
 * Access preview is a read-only diagnostic view, so a dedicated editor route
 * has nothing to offer it — every write the form could make would be refused.
 * Send a previewing owner back to the surface the editor was reached from
 * instead of rendering a form that cannot save.
 *
 * The read-only pages resolve the preview and render it. Only the editor
 * routes take this shortcut, and they take it before any data is loaded.
 */
export function redirectAccessPreviewAway(
  query: Record<string, string | string[] | undefined>,
  href: string,
) {
  if (query[ACCESS_PREVIEW_PARAM] || query[USER_ACCESS_PREVIEW_PARAM]) {
    redirect(href);
  }
}

/**
 * Where an editor route's back control and a cancelled edit return to.
 *
 * The caller passes the surface it was opened from through `?from=`, so
 * cancelling a task created from the calendar goes back to the calendar rather
 * than to a fixed default. That makes it attacker-controlled, so only a
 * same-origin absolute path is accepted: a leading `//` or `/\` is a
 * protocol-relative URL that would navigate off the site, and anything else
 * falls back to the caller's own default.
 */
export function editorBackHref(
  from: string | string[] | undefined,
  fallback: string,
) {
  if (typeof from !== "string") return fallback;
  if (!from.startsWith("/")) return fallback;
  if (from.startsWith("//") || from.startsWith("/\\")) return fallback;
  return from;
}

/** The reference collections every resource editor form reads. */
export const EDITOR_COLLECTIONS = [
  "profiles",
  "statuses",
  "categories",
  "categoryOwners",
  "projects",
  "projectOwners",
  "labels",
] as const;
