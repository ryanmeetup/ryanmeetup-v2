import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Task,
  TaskAssignee,
  TaskCategory,
} from "@/lib/tasks/task-types";
import type {
  TaskMoveInput,
  TaskSaveInput,
} from "../../api-schema/task";

export type SavedTask = {
  task: Task;
  assignees: TaskAssignee[];
  categories: TaskCategory[];
};

export async function saveTask(
  supabase: SupabaseClient,
  input: TaskSaveInput,
) {
  const { id, task, categoryIds } = input;
  const result = await supabase.rpc("save_task", {
    task_id: id,
    task_values: task,
    category_ids: categoryIds,
    assignee_ids: task.assignee_id ? [task.assignee_id] : [],
  });
  return { data: result.data as SavedTask, error: result.error };
}

export async function moveTask(
  supabase: SupabaseClient,
  input: TaskMoveInput,
) {
  const result = await supabase.rpc("move_task", {
    moved_task_id: input.id,
    next_status_id: input.statusId,
    next_board_position: input.boardPosition,
  });
  return { data: result.data as Task, error: result.error };
}

export async function deleteTask(supabase: SupabaseClient, id: string) {
  const result = await supabase.rpc("delete_task", { deleted_task_id: id });
  return { data: result.data as string, error: result.error };
}
