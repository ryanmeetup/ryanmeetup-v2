import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  taskChangeSnapshot,
  type TaskChangeSnapshot,
} from "@/lib/activity/task-change-summary";
import { TASK_COLUMNS } from "@/lib/workspace/database-shapes";
import { WORKSPACE_COLUMNS } from "@/lib/server/workspace-loader";
import type { TaskActivity } from "@/lib/activity/activity-types";
import type { Task, TaskComment } from "@/lib/tasks/task-types";

/**
 * Reads the pre-save state of a task so a save can be described by the fields
 * it actually changed. Uses the caller's client so an unreadable task simply
 * yields no snapshot and the save keeps its generic activity record.
 */
export async function loadTaskChangeSnapshot(
  supabase: SupabaseClient,
  taskId: string,
): Promise<TaskChangeSnapshot | null> {
  const [task, categories] = await Promise.all([
    supabase.from("tasks").select(TASK_COLUMNS).eq("id", taskId).maybeSingle(),
    supabase
      .from("task_categories")
      .select("category_id")
      .eq("task_id", taskId),
  ]);
  if (task.error || categories.error || !task.data) return null;
  return savedTaskSnapshot(
    task.data as unknown as Task,
    (categories.data ?? []).map((row) => row.category_id as string),
  );
}

export function savedTaskSnapshot(task: Task, categoryIds: string[]) {
  return taskChangeSnapshot({
    ...task,
    category_ids: categoryIds,
    category_tags: task.category_tags ?? {},
  });
}

/**
 * Reads back the rows a save or a move wrote on the caller's behalf.
 *
 * Neither comes out of the RPC's own payload: the audit rows are written by
 * the `log_task_change` trigger, and a required status reason is stored as the
 * task's next comment inside the same transaction. The panels read both out of
 * the workspace the client holds, so a response that omits them leaves the
 * activity list and the conversation a page refresh behind the change.
 *
 * A save that moves a task *and* edits it writes two rows, which is why this
 * reads two: handing back only the newest would leave the edit invisible until
 * a refresh. Both rows carry the transaction's timestamp, so an identical
 * `created_at` is what identifies the pair -- no clock of ours is involved.
 */
export async function savedTaskRecords(
  supabase: SupabaseClient,
  taskId: string,
  statusReason: string | null,
): Promise<{ activity: TaskActivity[]; comment: TaskComment | null }> {
  const [activity, comment] = await Promise.all([
    supabase
      .from("task_activity")
      .select(WORKSPACE_COLUMNS.activity)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(2),
    statusReason
      ? supabase
          .from("task_comments")
          .select(WORKSPACE_COLUMNS.comments)
          .eq("task_id", taskId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const reason = comment.data as TaskComment | null;
  const recent = (activity.data ?? []) as unknown as TaskActivity[];
  const written = recent.filter(
    (row) => row.created_at === recent[0]?.created_at,
  );
  return {
    activity: written,
    // A reason is only stored when the status actually changed, and editing a
    // task already in that status keeps its original. Matching the body is
    // what stops an older comment being handed back as one this save wrote.
    comment: reason?.body === statusReason ? reason : null,
  };
}
