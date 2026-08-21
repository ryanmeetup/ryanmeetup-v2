import type { AccessPreview } from "@/lib/workspace/workspace-types";
import type { Priority } from "@/lib/tasks/task-types";
import {
  categoryTagFilterValue,
  type CategoryTagFilter,
} from "@/lib/tasks/task-filter-values";

export type TaskQueryFilters = {
  statuses: string[];
  excludedStatuses: string[];
  projects: string[];
  excludedProjects: string[];
  assignees: string[];
  excludedAssignees: string[];
  reporters: string[];
  excludedReporters: string[];
  categories: string[];
  excludedCategories: string[];
  priorities: Priority[];
  excludedPriorities: Priority[];
  dueWithin: string[];
  excludedDueWithin: string[];
  tags: CategoryTagFilter[];
  excludedTags: CategoryTagFilter[];
};

type TaskQueryOptions = {
  filters: TaskQueryFilters;
  page: number;
  pageSize: number;
  preview?: AccessPreview;
  search: string;
  sort: string;
  view: "board" | "list";
  visibility: "active" | "archived";
};

export function buildTaskQueryParams(options: TaskQueryOptions) {
  const { filters, page, pageSize, preview, search, sort, view, visibility } =
    options;
  const params = new URLSearchParams({ visibility });
  if (preview)
    params.set(
      preview.kind === "group" ? "viewAsGroup" : "viewAsUser",
      preview.kind === "group" ? preview.subjectId : preview.subjectName,
    );
  if (view !== "list") return params;
  params.set("paginated", "1");
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  params.set("sort", sort);
  const entries: Array<[string, string[]]> = [
    ["status", filters.statuses],
    ["excludeStatuses", filters.excludedStatuses],
    ["project", filters.projects],
    ["excludeProjects", filters.excludedProjects],
    ["assignee", filters.assignees],
    ["excludeAssignees", filters.excludedAssignees],
    ["reporter", filters.reporters],
    ["excludeReporters", filters.excludedReporters],
    ["categories", filters.categories],
    ["excludeCategories", filters.excludedCategories],
    ["priority", filters.priorities],
    ["excludePriorities", filters.excludedPriorities],
    ["dueWithin", filters.dueWithin],
    ["excludeDueWithin", filters.excludedDueWithin],
    ["tags", filters.tags.map(categoryTagFilterValue)],
    ["excludeTags", filters.excludedTags.map(categoryTagFilterValue)],
  ];
  entries.forEach(([name, values]) => {
    if (values.length) params.set(name, values.join(","));
  });
  if (search.trim()) params.set("search", search.trim());
  return params;
}

export function taskQuerySignature(
  options: Omit<TaskQueryOptions, "page" | "preview">,
) {
  const { filters, pageSize, search, sort, view, visibility } = options;
  if (view === "board") return `board|${visibility}`;
  return [
    visibility,
    filters.statuses,
    filters.excludedStatuses,
    filters.projects,
    filters.excludedProjects,
    filters.assignees,
    filters.excludedAssignees,
    filters.reporters,
    filters.excludedReporters,
    filters.categories,
    filters.excludedCategories,
    filters.priorities,
    filters.excludedPriorities,
    filters.dueWithin,
    filters.excludedDueWithin,
    filters.tags.map(categoryTagFilterValue),
    filters.excludedTags.map(categoryTagFilterValue),
    search,
    sort,
    pageSize,
  ].join("|");
}
