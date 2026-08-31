import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task, TaskAssignee, TaskCategory } from "@/lib/tasks/task-types";
import type { TaskMoveInput, TaskSaveInput } from "../../api-schema/task";

/**
 * `save_task` and `move_task` raise this SQLSTATE when a status that requires
 * a reason is entered without one. Its message is authored by the migration
 * and names the status, so it is safe to return to the caller verbatim.
 */
const STATUS_REASON_REQUIRED = "TK001";

export function isMissingStatusReason(error: { code?: string } | null) {
  return error?.code === STATUS_REASON_REQUIRED;
}

export type SavedTask = {
  task: Task;
  /**
   * The `updated the task` row this save wrote, or null when the save changed
   * no described fields. Named by the transaction so the field-level diff is
   * attached to the right row.
   */
  activity_id: string | null;
  assignees: TaskAssignee[];
  categories: TaskCategory[];
};

export async function saveTask(supabase: SupabaseClient, input: TaskSaveInput) {
  const { id, task, categoryIds, statusReason } = input;
  const result = await supabase.rpc("save_task", {
    task_id: id,
    task_values: task,
    category_ids: categoryIds,
    assignee_ids: task.assignee_id ? [task.assignee_id] : [],
    status_reason: statusReason,
  });
  return { data: result.data as SavedTask, error: result.error };
}

export async function moveTask(supabase: SupabaseClient, input: TaskMoveInput) {
  const result = await supabase.rpc("move_task", {
    moved_task_id: input.id,
    next_status_id: input.statusId,
    next_board_position: input.boardPosition,
    status_reason: input.statusReason,
  });
  return { data: result.data as Task, error: result.error };
}

export async function deleteTask(supabase: SupabaseClient, id: string) {
  const result = await supabase.rpc("delete_task", { deleted_task_id: id });
  return { data: result.data as string, error: result.error };
}
