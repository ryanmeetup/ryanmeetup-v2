import type { Task } from "./task-types";
import {
  digestDefaults,
  type DigestSectionKey,
  type DigestSettings,
} from "@/lib/digest/digest-settings";

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

/**
 * One rendered group. The digest is an ordered list rather than a fixed-shape
 * object so `/admin/usage` owns which sections appear and in what order.
 */
export type DigestSection = { key: DigestSectionKey; tasks: DigestTask[] };
export type TaskDigest = DigestSection[];

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

/** Membership test per section key, evaluated against one assignee's tasks. */
function sectionMembers(
  key: DigestSectionKey,
  tasks: DigestTask[],
  today: string,
  settings: DigestSettings,
  now: Date,
) {
  switch (key) {
    case "overdue":
      return tasks.filter((task) => task.due_date && task.due_date < today);
    case "dueToday":
      return tasks.filter((task) => task.due_date === today);
    case "upcoming": {
      const boundary = addDays(today, settings.upcomingDays);
      return tasks.filter(
        (task) =>
          task.due_date && task.due_date > today && task.due_date <= boundary,
      );
    }
    case "highPriority":
      return tasks.filter(
        (task) =>
          !task.due_date &&
          (task.priority === "high" || task.priority === "urgent"),
      );
    case "recentlyUpdated": {
      const boundary = new Date(
        now.getTime() - settings.recentDays * 24 * 60 * 60 * 1000,
      );
      return tasks.filter((task) => new Date(task.updated_at) >= boundary);
    }
  }
}

/**
 * Group one assignee's active work into the configured sections. Sections that
 * are turned off are never evaluated, and empty ones are dropped so the caller
 * can treat an empty result as "nothing worth emailing".
 */
export function buildTaskDigest(
  tasks: DigestTask[],
  today: string,
  settings: DigestSettings = digestDefaults,
  now = new Date(),
): TaskDigest {
  return settings.sections
    .map((key) => ({
      key,
      tasks: sortTasks(sectionMembers(key, tasks, today, settings, now)),
    }))
    .filter((section) => section.tasks.length > 0);
}

/** Distinct tasks across the digest; a task in two sections is counted once. */
export function taskDigestCount(digest: TaskDigest) {
  return new Set(
    digest.flatMap((section) => section.tasks.map((task) => task.id)),
  ).size;
}
