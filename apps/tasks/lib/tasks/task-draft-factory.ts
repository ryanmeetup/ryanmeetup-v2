import type { TaskDraft } from "@/lib/tasks/task-mutations";
import type { NewTaskDetailsDraft, Task } from "@/lib/tasks/task-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";

export function emptyTaskDraft(
  statusId: string,
  reportedBy: string,
): TaskDraft {
  return {
    title: "",
    description: "",
    status_id: statusId,
    project_id: null,
    assignee_id: null,
    reported_by: reportedBy,
    start_date: null,
    due_date: null,
    due_time: null,
    reminder_at: null,
    priority: "medium",
    category_ids: [],
    category_tags: {},
  };
}

export function emptyNewTaskDetails(): NewTaskDetailsDraft {
  return {
    checklist: [],
    files: [],
    urls: [],
    comment: "",
  };
}

export function newWorkspaceTaskDraft(data: WorkspaceData) {
  const statusId =
    data.statuses.find((status) => status.is_default)?.id ??
    data.statuses[0]?.id ??
    "";
  return emptyTaskDraft(statusId, data.currentProfile.id);
}

export function taskDraftFromTask(
  task: Task,
  categoryIds: Iterable<string>,
): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    status_id: task.status_id,
    project_id: task.project_id,
    category_ids: [...categoryIds],
    category_tags: task.category_tags ?? {},
    assignee_id: task.assignee_id,
    reported_by: task.reported_by,
    start_date: task.start_date,
    due_date: task.due_date,
    due_time: task.due_time,
    reminder_at: task.reminder_at,
    priority: task.priority,
  };
}

export function editTaskDraft(
  task: Task,
  categoryIds: Iterable<string>,
): TaskDraft {
  return taskDraftFromTask(task, categoryIds);
}
