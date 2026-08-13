import type { Dispatch, SetStateAction } from "react";
import { mutate } from "@/lib/mutation-client";
import type {
  Status,
  Task,
  TaskAssignee,
  TaskCategory,
} from "@/lib/task-types";
import type { WorkspaceData } from "@/lib/workspace-types";
import { withNormalizedTaskSchedule } from "@/lib/task-scheduling";

export type TaskDraft = Pick<
  Task,
  | "title"
  | "description"
  | "status_id"
  | "project_id"
  | "assignee_id"
  | "reported_by"
  | "start_date"
  | "due_date"
  | "due_time"
  | "reminder_at"
  | "priority"
> & { category_ids: string[]; category_tags: Record<string, string[]> };

type MutationContext = {
  demoMode: boolean;
  getData: () => WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
};

export type SavedTask = {
  task: Task;
  assignees: TaskAssignee[];
  categories: TaskCategory[];
};

const archiveDelayMs = 14 * 24 * 60 * 60 * 1000;

function completionLifecycle(
  statusId: string,
  statuses: Status[],
  current?: Pick<Task, "completed_at" | "archived_at">,
) {
  if (!statuses.find((status) => status.id === statusId)?.is_completed) {
    return { completed_at: null, archived_at: null };
  }
  const completedAt = current?.completed_at ?? new Date().toISOString();
  return {
    completed_at: completedAt,
    archived_at:
      current?.archived_at ??
      new Date(new Date(completedAt).getTime() + archiveDelayMs).toISOString(),
  };
}

export function createTaskMutationService(context: MutationContext) {
  return {
    async save(draft: TaskDraft, editing: Task | null): Promise<SavedTask> {
      const snapshot = context.getData();
      const { category_ids: categoryIds, ...rawTaskDraft } = draft;
      const taskDraft = withNormalizedTaskSchedule(rawTaskDraft);
      if (context.demoMode) {
        const now = new Date().toISOString();
        const task: Task = editing
          ? {
              ...editing,
              ...taskDraft,
              ...completionLifecycle(
                draft.status_id,
                snapshot.statuses,
                editing,
              ),
              title: draft.title.trim(),
              updated_at: now,
            }
          : {
              ...taskDraft,
              ...completionLifecycle(draft.status_id, snapshot.statuses),
              title: draft.title.trim(),
              id: crypto.randomUUID(),
              task_number:
                Math.max(0, ...snapshot.tasks.map((item) => item.task_number)) +
                1,
              created_by: snapshot.currentProfile.id,
              board_position:
                Math.max(
                  0,
                  ...snapshot.tasks
                    .filter((item) => item.status_id === draft.status_id)
                    .map((item) => item.board_position),
                ) + 1024,
              created_at: now,
              updated_at: now,
            };
        return {
          task,
          assignees: task.assignee_id
            ? [{ task_id: task.id, profile_id: task.assignee_id }]
            : [],
          categories: categoryIds.map((category_id) => ({
            task_id: task.id,
            category_id,
          })),
        };
      }
      const result = await mutate<SavedTask>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ id: editing?.id, task: taskDraft, categoryIds }),
      });
      return {
        task: result.task,
        assignees: result.assignees ?? [],
        categories: result.categories ?? [],
      };
    },

    applySaved(saved: SavedTask, editing: boolean) {
      context.setData((current) => ({
        ...current,
        tasks: editing
          ? current.tasks.map((task) =>
              task.id === saved.task.id ? saved.task : task,
            )
          : [
              saved.task,
              ...current.tasks.filter((task) => task.id !== saved.task.id),
            ],
        taskAssignees: [
          ...current.taskAssignees.filter(
            (item) => item.task_id !== saved.task.id,
          ),
          ...saved.assignees,
        ],
        taskCategories: [
          ...current.taskCategories.filter(
            (item) => item.task_id !== saved.task.id,
          ),
          ...saved.categories,
        ],
      }));
    },

    async remove(id: string) {
      if (!context.demoMode) {
        await mutate<{ id: string }>("/api/tasks", {
          method: "DELETE",
          body: JSON.stringify({ id }),
        });
      }
      context.setData((current) => ({
        ...current,
        tasks: current.tasks.filter((item) => item.id !== id),
        subtasks: current.subtasks.filter((item) => item.task_id !== id),
        comments: current.comments.filter((item) => item.task_id !== id),
        activity: current.activity.filter((item) => item.task_id !== id),
        attachments: current.attachments.filter((item) => item.task_id !== id),
        taskAssignees: current.taskAssignees.filter(
          (item) => item.task_id !== id,
        ),
        taskLabels: current.taskLabels.filter((item) => item.task_id !== id),
        taskCategories: current.taskCategories.filter(
          (item) => item.task_id !== id,
        ),
      }));
    },

    async move(
      id: string,
      statusId: string,
      targetId?: string,
      edge: "before" | "after" = "after",
    ) {
      const snapshot = context.getData();
      const original = snapshot.tasks.find((task) => task.id === id);
      if (!original || targetId === id) return;
      const destination = snapshot.tasks
        .filter((task) => task.status_id === statusId && task.id !== id)
        .sort((a, b) => a.board_position - b.board_position);
      const index = targetId
        ? destination.findIndex((task) => task.id === targetId)
        : -1;
      let position = (destination.at(-1)?.board_position ?? 0) + 1024;
      if (index >= 0 && edge === "before") {
        position = destination[index - 1]
          ? (destination[index - 1].board_position +
              destination[index].board_position) /
            2
          : destination[index].board_position - 1024;
      } else if (index >= 0) {
        position = destination[index + 1]
          ? (destination[index].board_position +
              destination[index + 1].board_position) /
            2
          : destination[index].board_position + 1024;
      }
      context.setData((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === id
            ? {
                ...task,
                status_id: statusId,
                board_position: position,
                ...completionLifecycle(statusId, current.statuses, task),
                updated_at: new Date().toISOString(),
              }
            : task,
        ),
      }));
      if (!context.demoMode) {
        try {
          const result = await mutate<{ task: Task }>("/api/tasks", {
            method: "PATCH",
            body: JSON.stringify({ id, statusId, boardPosition: position }),
          });
          context.setData((current) => ({
            ...current,
            tasks: current.tasks.map((task) =>
              task.id === id ? result.task : task,
            ),
          }));
        } catch (error) {
          context.setData((current) => ({
            ...current,
            tasks: current.tasks.map((task) =>
              task.id === id ? original : task,
            ),
          }));
          throw error;
        }
      }
    },
  };
}
