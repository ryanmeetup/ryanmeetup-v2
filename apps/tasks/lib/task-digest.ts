import type { Task } from "./task-types";

export type DigestTask = Pick<
  Task,
  | "id"
  | "task_number"
  | "title"
  | "description"
  | "due_date"
  | "due_time"
  | "priority"
  | "updated_at"
> & {
  project?: { name: string } | null;
  status?: { color: string; name: string } | null;
};

export type TaskDigest = {
  overdue: DigestTask[];
  dueToday: DigestTask[];
  upcoming: DigestTask[];
  highPriority: DigestTask[];
  recentlyUpdated: DigestTask[];
};

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function sortTasks(tasks: DigestTask[]) {
  return [...tasks].sort((left, right) =>
    `${left.due_date ?? "9999"}:${left.due_time ?? ""}:${left.task_number}`.localeCompare(
      `${right.due_date ?? "9999"}:${right.due_time ?? ""}:${right.task_number}`,
    ),
  );
}

export function buildTaskDigest(
  tasks: DigestTask[],
  today: string,
  upcomingDays = 3,
  now = new Date(),
): TaskDigest {
  const upcomingBoundary = addDays(today, upcomingDays);
  const recentBoundary = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  return {
    overdue: sortTasks(
      tasks.filter((task) => task.due_date && task.due_date < today),
    ),
    dueToday: sortTasks(
      tasks.filter((task) => task.due_date === today),
    ),
    upcoming: sortTasks(
      tasks.filter(
        (task) =>
          task.due_date &&
          task.due_date > today &&
          task.due_date <= upcomingBoundary,
      ),
    ),
    highPriority: sortTasks(
      tasks.filter(
        (task) =>
          !task.due_date &&
          (task.priority === "high" || task.priority === "urgent"),
      ),
    ),
    recentlyUpdated: sortTasks(
      tasks.filter((task) => new Date(task.updated_at) >= recentBoundary),
    ),
  };
}

export function taskDigestCount(digest: TaskDigest) {
  return new Set(Object.values(digest).flatMap((tasks) => tasks.map((task) => task.id)))
    .size;
}
