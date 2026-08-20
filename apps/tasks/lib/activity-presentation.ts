import { profileDisplayName } from "./presentation";
import { taskActivityLabel, taskStatusChange } from "./task-activity";
import type { Profile } from "./workspace-types";
import type { Category, Project } from "./resource-types";
import type { Status, Task } from "./task-types";
import type { TaskActivity } from "./activity-types";

export type ActivityDescription =
  | { kind: "text"; label: string }
  | { kind: "status"; from?: Status; to?: Status };

export type ActivityPresentationRow = {
  item: TaskActivity;
  actor?: Profile;
  actorName: string;
  task?: Task;
  project?: Project;
  category?: Category;
  resourceName?: string;
  resourceHref?: string;
  description: ActivityDescription;
};

export type ActivityPresentationGroup = {
  date: string;
  label: string;
  rows: ActivityPresentationRow[];
};

export function describeActivity(
  item: TaskActivity,
  statuses: Status[],
): ActivityDescription {
  if (item.action !== "moved task")
    return { kind: "text", label: taskActivityLabel(item.action) };
  const { from, to } = taskStatusChange(item, statuses);
  if (!from && !to) return { kind: "text", label: "Task moved" };
  return { kind: "status", from, to };
}

export function resolveActivityRows(
  activity: TaskActivity[],
  data: {
    tasks: Task[];
    profiles: Profile[];
    projects: Project[];
    categories: Category[];
    statuses: Status[];
  },
): ActivityPresentationRow[] {
  const tasks = new Map(data.tasks.map((task) => [task.id, task]));
  const profiles = new Map(
    data.profiles.map((profile) => [profile.id, profile]),
  );
  const projects = new Map(
    data.projects.map((project) => [project.id, project]),
  );
  const categories = new Map(
    data.categories.map((category) => [category.id, category]),
  );
  return activity.map((item) => {
    const task = item.task_id ? tasks.get(item.task_id) : undefined;
    const actor = item.actor_id ? profiles.get(item.actor_id) : undefined;
    const category = item.action.startsWith("category.")
      ? (typeof item.details.resource_id === "string"
          ? categories.get(item.details.resource_id)
          : undefined) ??
        data.categories.find(
          (candidate) => candidate.name === item.details.resource_name,
        )
      : undefined;
    return {
      item,
      actor,
      actorName: actor ? profileDisplayName(actor) : "System",
      task,
      project: task?.project_id
        ? projects.get(task.project_id)
        : item.details.project_id
          ? projects.get(item.details.project_id)
          : undefined,
      category,
      resourceName: item.details.resource_name,
      resourceHref: item.details.resource_href,
      description: describeActivity(item, data.statuses),
    };
  });
}

export function groupActivityByDate(
  rows: ActivityPresentationRow[],
  locale = "en-US",
  timeZone?: string,
): ActivityPresentationGroup[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone,
  });
  const groups = new Map<string, ActivityPresentationGroup>();
  for (const row of rows) {
    const date = new Date(row.item.created_at);
    const keyFormatter = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    });
    const key = keyFormatter.format(date);
    const group = groups.get(key) ?? {
      date: key,
      label: formatter.format(date),
      rows: [],
    };
    group.rows.push(row);
    groups.set(key, group);
  }
  return [...groups.values()];
}
