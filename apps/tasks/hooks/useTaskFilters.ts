"use client";

import { useEffect, useState } from "react";
import { useQueryParamState } from "@ryanmeetup/hooks";

function useInclusionQueryParams(name: string, excludedName: string) {
  const [included, setIncluded] = useQueryParamState(name, "all");
  const [excluded, setExcluded] = useQueryParamState(excludedName, "");
  return { included, setIncluded, excluded, setExcluded };
}

export function useTaskFilters(setSearch: (value: string) => void) {
  const assignees = useInclusionQueryParams("assignee", "excludeAssignees");
  const reporters = useInclusionQueryParams("reporter", "excludeReporters");
  const [group, setGroup] = useQueryParamState("category", "all");
  const [includedCategories, setIncludedCategories] = useQueryParamState(
    "categories",
    "",
  );
  const [excludedCategories, setExcludedCategories] = useQueryParamState(
    "excludeCategories",
    "",
  );
  const projects = useInclusionQueryParams("project", "excludeProjects");
  const statuses = useInclusionQueryParams("status", "excludeStatuses");
  const priorities = useInclusionQueryParams("priority", "excludePriorities");
  const dueDates = useInclusionQueryParams("dueWithin", "excludeDueWithin");
  const tags = useInclusionQueryParams("tags", "excludeTags");
  const [visibilityParam, setVisibility] = useQueryParamState(
    "visibility",
    "active",
  );
  const visibility: "active" | "archived" =
    visibilityParam === "archived" ? "archived" : "active";
  const [sortParam, setSort] = useQueryParamState("sort", "updated");
  const sort = ["updated", "due", "priority"].includes(sortParam)
    ? sortParam
    : "updated";
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function clear() {
    setSearch("");
    assignees.setIncluded("all");
    assignees.setExcluded("");
    reporters.setIncluded("all");
    reporters.setExcluded("");
    setGroup("all");
    setIncludedCategories("");
    setExcludedCategories("");
    projects.setIncluded("all");
    projects.setExcluded("");
    statuses.setIncluded("all");
    statuses.setExcluded("");
    priorities.setIncluded("all");
    priorities.setExcluded("");
    dueDates.setIncluded("all");
    dueDates.setExcluded("");
    tags.setIncluded("all");
    tags.setExcluded("");
    setVisibility("active");
    setSort("updated");
  }

  return {
    assignee: assignees.included,
    setAssignee: assignees.setIncluded,
    excludedAssignees: assignees.excluded,
    setExcludedAssignees: assignees.setExcluded,
    reporter: reporters.included,
    setReporter: reporters.setIncluded,
    excludedReporters: reporters.excluded,
    setExcludedReporters: reporters.setExcluded,
    group,
    setGroup,
    includedCategories,
    setIncludedCategories,
    excludedCategories,
    setExcludedCategories,
    project: projects.included,
    setProject: projects.setIncluded,
    excludedProjects: projects.excluded,
    setExcludedProjects: projects.setExcluded,
    status: statuses.included,
    setStatus: statuses.setIncluded,
    excludedStatuses: statuses.excluded,
    setExcludedStatuses: statuses.setExcluded,
    priority: priorities.included,
    setPriority: priorities.setIncluded,
    excludedPriorities: priorities.excluded,
    setExcludedPriorities: priorities.setExcluded,
    visibility,
    setVisibility,
    sort,
    setSort,
    clock,
    clear,
    dueWithin: dueDates.included,
    setDueWithin: dueDates.setIncluded,
    excludedDueWithin: dueDates.excluded,
    setExcludedDueWithin: dueDates.setExcluded,
    tags: tags.included,
    setTags: tags.setIncluded,
    excludedTags: tags.excluded,
    setExcludedTags: tags.setExcluded,
  };
}
