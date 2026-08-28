import type { ResourceKind } from "@/lib/resources/resource-attachment-drafts";

/**
 * More than one mounted view can show the same project's or category's
 * attachments — the board header for the project a board is filtered to, and
 * the edit modal opened above it — and each holds the copy it fetched when it
 * mounted. Without a signal between them, a file attached in the modal only
 * reaches the header on a full page reload.
 *
 * Every write publishes here, as does the workspace realtime channel for
 * writes made in another tab or by a teammate, and each view refetches the
 * resource it is showing.
 */
export type ResourceAttachmentChange = {
  kind: ResourceKind;
  /** Null when the resource is unknown: a delete event carries only the row id. */
  resourceId: string | null;
  /** The view that made the change, so it does not refetch its own write. */
  origin?: object;
};

type Listener = (change: ResourceAttachmentChange) => void;

const listeners = new Set<Listener>();

export function subscribeToResourceAttachments(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishResourceAttachmentsChanged(
  change: ResourceAttachmentChange,
) {
  // Copied so a listener that unsubscribes while handling one change does not
  // cost a later listener its turn.
  for (const listener of [...listeners]) listener(change);
}

/** A change that names no resource reaches every view of its kind. */
export function resourceAttachmentsAffected(
  change: ResourceAttachmentChange,
  view: { kind: ResourceKind; resourceId: string; origin: object },
) {
  return (
    change.kind === view.kind &&
    change.origin !== view.origin &&
    (change.resourceId === null || change.resourceId === view.resourceId)
  );
}
