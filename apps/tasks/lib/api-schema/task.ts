import type { Priority, Task } from "@/lib/tasks/task-types";
import { normalizeTaskSchedule } from "@/lib/tasks/task-scheduling";
import {
  isJsonObject,
  objectWithKeys,
  parseUuid,
  requiredTrimmedText,
  uuidList,
} from "./shared";

type TaskInput = Pick<
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
  | "category_tags"
>;
const priorities: Priority[] = ["low", "medium", "high", "urgent"];

export function taskSaveSchema(value: unknown) {
  const body = objectWithKeys(value, ["id", "task", "categoryIds"]);
  if (!body || !isJsonObject(body.task)) return null;
  const task = body.task as Partial<TaskInput>;
  const title = requiredTrimmedText(task.title, 500);
  const statusId = parseUuid(task.status_id);
  const reportedBy = parseUuid(task.reported_by);
  const categoryIds = uuidList(body.categoryIds);
  const categoryTags = task.category_tags ?? {};
  const id = body.id === undefined ? null : parseUuid(body.id);
  const schedule = normalizeTaskSchedule(task);
  if (
    !title ||
    !statusId ||
    !reportedBy ||
    (body.id !== undefined && !id) ||
    !priorities.includes(task.priority as Priority) ||
    !categoryIds?.length ||
    !schedule ||
    !categoryTags ||
    typeof categoryTags !== "object" ||
    Array.isArray(categoryTags)
  )
    return null;
  return {
    id,
    task: {
      ...task,
      title,
      status_id: statusId,
      reported_by: reportedBy,
      category_tags: categoryTags,
      ...schedule,
    },
    categoryIds,
  };
}

export function taskMoveSchema(value: unknown) {
  const body = objectWithKeys(value, ["id", "statusId", "boardPosition"]);
  const id = body && parseUuid(body.id);
  const statusId = body && parseUuid(body.statusId);
  return id &&
    statusId &&
    typeof body!.boardPosition === "number" &&
    Number.isFinite(body!.boardPosition)
    ? { id, statusId, boardPosition: body!.boardPosition }
    : null;
}

export type TaskSaveInput = NonNullable<ReturnType<typeof taskSaveSchema>>;
export type TaskMoveInput = NonNullable<ReturnType<typeof taskMoveSchema>>;
