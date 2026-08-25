import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  taskChangeSnapshot,
  type TaskChangeSnapshot,
} from "@/lib/activity/task-change-summary";
import { TASK_COLUMNS } from "@/lib/workspace/database-shapes";
import type { Task } from "@/lib/tasks/task-types";

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
