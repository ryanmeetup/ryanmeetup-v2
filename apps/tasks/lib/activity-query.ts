import { profileDisplayName, splitCommaSeparated } from "./presentation";
import type { Project } from "./resource-types";
import type { Profile } from "./workspace-types";

export type ActivityFilters = {
  projects: string;
  excludeProjects: string;
  people: string;
  excludePeople: string;
  events: string;
  excludeEvents: string;
  when: string;
};

function resolveList(value: string, resolve: (value: string) => string) {
  return splitCommaSeparated(value).map(resolve).join(",");
}

export function activityFilterCount(filters: ActivityFilters) {
  return (
    [
      filters.projects,
      filters.excludeProjects,
      filters.people,
      filters.excludePeople,
      filters.events,
      filters.excludeEvents,
    ].reduce((total, value) => total + splitCommaSeparated(value).length, 0) +
    (filters.when === "all" ? 0 : 1)
  );
}

export function buildActivityQuery(
  filters: ActivityFilters,
  projects: Project[],
  profiles: Profile[],
) {
  const params = new URLSearchParams();
  const projectIds = (value: string) =>
    resolveList(value, (item) =>
      item === "none"
        ? item
        : (projects.find(
            (project) => project.id === item || project.name === item,
          )?.id ?? item),
    );
  const personIds = (value: string) =>
    resolveList(value, (item) =>
      item === "system"
        ? item
        : (profiles.find(
            (profile) =>
              profile.id === item || profileDisplayName(profile) === item,
          )?.id ?? item),
    );
  const values: [string, string][] = [
    ["projects", projectIds(filters.projects)],
    ["excludeProjects", projectIds(filters.excludeProjects)],
    ["people", personIds(filters.people)],
    ["excludePeople", personIds(filters.excludePeople)],
    ["events", filters.events],
    ["excludeEvents", filters.excludeEvents],
  ];
  for (const [key, value] of values) if (value) params.set(key, value);
  if (filters.when !== "all") params.set("when", filters.when);
  return params;
}
