import type { Category, Project } from "@/lib/resource-types";
import type { Profile } from "@/lib/workspace-types";
import type { Status, Task } from "@/lib/task-types";
import { taskKey, taskPath } from "@/lib/task-key";
import { profileDisplayName } from "@/lib/presentation";

export const TASK_SEARCH_LIMIT = 25;
export const TASK_SEARCH_MIN_LENGTH = 3;

export type TaskSearchRelatedResults = {
  projects: Project[];
  categories: Category[];
  profiles: Profile[];
  statuses: Status[];
};

export type TaskSearchGroup = keyof TaskSearchRelatedResults | "issues";
export type TaskSearchPreview = Record<string, string | null | undefined>;

export function normalizeSearchText(value: string | null | undefined) {
  return value?.toLocaleLowerCase().trim() ?? "";
}

export function rankTaskSearchResults({
  tasks,
  query,
  projectNames = new Map(),
  limit = TASK_SEARCH_LIMIT,
}: {
  tasks: Task[];
  query: string;
  projectNames?: ReadonlyMap<string, string>;
  limit?: number;
}) {
  const needle = normalizeSearchText(query);
  if (needle.length < TASK_SEARCH_MIN_LENGTH) return [];

  return tasks
    .map((task) => {
      const key = normalizeSearchText(taskKey(task));
      const title = normalizeSearchText(task.title);
      const description = normalizeSearchText(task.description);
      const project = normalizeSearchText(
        task.project_id ? projectNames.get(task.project_id) : "",
      );
      let score = 0;
      if (key === needle) score += 100;
      else if (key.startsWith(needle)) score += 75;
      if (title === needle) score += 90;
      else if (title.startsWith(needle)) score += 65;
      else if (title.includes(needle)) score += 45;
      if (project.includes(needle)) score += 20;
      if (description.includes(needle)) score += 10;
      return { task, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.task.task_number - left.task.task_number,
    )
    .slice(0, limit)
    .map(({ task }) => task);
}

export function findRelatedTaskSearchResults({
  query,
  projects,
  categories,
  profiles,
  statuses,
}: {
  query: string;
  projects: Project[];
  categories: Category[];
  profiles: Profile[];
  statuses: Status[];
}): TaskSearchRelatedResults {
  const needle = normalizeSearchText(query);
  if (needle.length < TASK_SEARCH_MIN_LENGTH)
    return { projects: [], categories: [], profiles: [], statuses: [] };
  const matches = (name: string, description?: string | null) =>
    normalizeSearchText(name).includes(needle) ||
    normalizeSearchText(description).includes(needle);
  return {
    projects: projects.filter(
      (project) =>
        !project.archived_at && matches(project.name, project.description),
    ),
    categories: categories.filter(
      (category) =>
        !category.archived_at && matches(category.name, category.description),
    ),
    profiles: profiles.filter((profile) => matches(profile.full_name)),
    statuses: statuses.filter((status) => matches(status.name)),
  };
}

export function orderTaskSearchGroups(
  related: TaskSearchRelatedResults,
  issueCount: number,
) {
  return new Map<TaskSearchGroup, number>(
    (
      [
        ["projects", related.projects.length],
        ["categories", related.categories.length],
        ["profiles", related.profiles.length],
        ["statuses", related.statuses.length],
        ["issues", issueCount],
      ] as const
    )
      .filter(([, count]) => count > 0)
      .sort((left, right) => left[1] - right[1])
      .map(([name], index) => [name, index]),
  );
}

function appendPreview(params: URLSearchParams, preview: TaskSearchPreview) {
  Object.entries(preview).forEach(([name, value]) => {
    if (value) params.set(name, value);
  });
  return params;
}

export function taskSearchResultHref(task: Task, preview: TaskSearchPreview) {
  const suffix = appendPreview(new URLSearchParams(), preview).toString();
  return `${taskPath(task)}${suffix ? `?${suffix}` : ""}`;
}

export function taskSearchAllHref(query: string, preview: TaskSearchPreview) {
  const params = appendPreview(
    new URLSearchParams({ view: "list", q: query }),
    preview,
  );
  return `/board?${params}`;
}

export function taskSearchFilterHref(
  name: string,
  value: string,
  preview: TaskSearchPreview,
) {
  const params = appendPreview(new URLSearchParams({ [name]: value }), preview);
  return `/board?${params}`;
}

export function firstRelatedTaskSearchHref(
  related: TaskSearchRelatedResults,
  preview: TaskSearchPreview,
) {
  if (related.projects[0])
    return taskSearchFilterHref("project", related.projects[0].name, preview);
  if (related.categories[0])
    return taskSearchFilterHref(
      "category",
      related.categories[0].name,
      preview,
    );
  if (related.profiles[0])
    return taskSearchFilterHref(
      "assignee",
      profileDisplayName(related.profiles[0]),
      preview,
    );
  if (related.statuses[0])
    return taskSearchFilterHref("status", related.statuses[0].name, preview);
  return null;
}
