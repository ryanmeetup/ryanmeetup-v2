import type { Task } from "./task-types";

export type TaskSchedule = Pick<
  Task,
  "start_date" | "due_date" | "due_time" | "reminder_at"
>;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isTaskLate(
  dueDate: string | null,
  isCompleted: boolean,
  today = new Date(),
) {
  return Boolean(dueDate && !isCompleted && dueDate < localDateValue(today));
}

function optionalValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeTaskSchedule(
  value: Partial<TaskSchedule>,
): TaskSchedule | null {
  const start_date = optionalValue(value.start_date);
  const due_date = optionalValue(value.due_date);
  const rawDueTime = optionalValue(value.due_time);
  const due_time = rawDueTime?.slice(0, 5) ?? null;
  const rawReminder = optionalValue(value.reminder_at);
  const reminderDate = rawReminder ? new Date(rawReminder) : null;

  if (
    (start_date && !datePattern.test(start_date)) ||
    (due_date && !datePattern.test(due_date)) ||
    (rawDueTime && !timePattern.test(rawDueTime)) ||
    (due_time && !due_date) ||
    (start_date && due_date && start_date > due_date) ||
    (reminderDate && Number.isNaN(reminderDate.getTime()))
  )
    return null;

  return {
    start_date,
    due_date,
    due_time,
    reminder_at: reminderDate?.toISOString() ?? null,
  };
}

export function withNormalizedTaskSchedule<T extends Partial<TaskSchedule>>(
  value: T,
): T {
  const schedule = normalizeTaskSchedule(value);
  if (!schedule) throw new Error("The task schedule is invalid.");
  return { ...value, ...schedule };
}
