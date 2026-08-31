import type { TaskActivity } from "@/lib/activity/activity-types";
import type { TaskComment } from "@/lib/tasks/task-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";

/**
 * Puts a row the server wrote on the caller's behalf into the workspace.
 *
 * Audit rows and status-reason comments are written by the request, not by the
 * caller, so nothing optimistic stands in for them. Every panel reads both out
 * of the workspace, which is why a write that records one has to hand it back:
 * without this the activity list and the conversation stay a page refresh
 * behind the change that produced them.
 *
 * Rows are keyed by id and replace any copy already present, so a write and
 * the realtime event for the same row cannot show up twice.
 */
export function withRecordedRows(
  recorded: {
    /** One row, or the set a single transaction wrote. */
    activity?: TaskActivity | TaskActivity[] | null;
    comment?: TaskComment | null;
  },
  current: WorkspaceData,
): WorkspaceData {
  const { activity, comment } = recorded;
  const written = activity
    ? Array.isArray(activity)
      ? activity
      : [activity]
    : [];
  const writtenIds = new Set(written.map((entry) => entry.id));
  return {
    ...current,
    activity: written.length
      ? [
          ...written,
          ...current.activity.filter((entry) => !writtenIds.has(entry.id)),
        ]
      : current.activity,
    comments: comment
      ? [
          ...current.comments.filter((entry) => entry.id !== comment.id),
          comment,
        ]
      : current.comments,
  };
}
