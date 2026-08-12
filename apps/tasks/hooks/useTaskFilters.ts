"use client";

import { useEffect, useState } from "react";
import { useQueryParamState } from "@ryanmeetup/hooks";

export function useTaskFilters(setSearch: (value: string) => void) {
  const [assignee, setAssignee] = useQueryParamState("assignee", "all");
  const [excludedAssignees, setExcludedAssignees] = useQueryParamState(
    "excludeAssignees",
    "",
  );
  const [reporter, setReporter] = useQueryParamState("reporter", "all");
  const [excludedReporters, setExcludedReporters] = useQueryParamState(
    "excludeReporters",
    "",
  );
  const [group, setGroup] = useQueryParamState("category", "all");
  const [includedCategories, setIncludedCategories] = useQueryParamState(
    "categories",
    "",
  );
  const [excludedCategories, setExcludedCategories] = useQueryParamState(
    "excludeCategories",
    "",
  );
  const [project, setProject] = useQueryParamState("project", "all");
  const [excludedProjects, setExcludedProjects] = useQueryParamState(
    "excludeProjects",
    "",
  );
  const [status, setStatus] = useQueryParamState("status", "all");
  const [excludedStatuses, setExcludedStatuses] = useQueryParamState(
    "excludeStatuses",
    "",
  );
  const [priority, setPriority] = useQueryParamState("priority", "all");
  const [excludedPriorities, setExcludedPriorities] = useQueryParamState(
    "excludePriorities",
    "",
  );
  const [dueWithin, setDueWithin] = useQueryParamState("dueWithin", "all");
  const [excludedDueWithin, setExcludedDueWithin] = useQueryParamState(
    "excludeDueWithin",
    "",
  );
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
    setAssignee("all");
    setExcludedAssignees("");
    setReporter("all");
    setExcludedReporters("");
    setGroup("all");
    setIncludedCategories("");
    setExcludedCategories("");
    setProject("all");
    setExcludedProjects("");
    setStatus("all");
    setExcludedStatuses("");
    setPriority("all");
    setExcludedPriorities("");
    setDueWithin("all");
    setExcludedDueWithin("");
    setVisibility("active");
    setSort("updated");
  }

  return {
    assignee,
    setAssignee,
    excludedAssignees,
    setExcludedAssignees,
    reporter,
    setReporter,
    excludedReporters,
    setExcludedReporters,
    group,
    setGroup,
    includedCategories,
    setIncludedCategories,
    excludedCategories,
    setExcludedCategories,
    project,
    setProject,
    excludedProjects,
    setExcludedProjects,
    status,
    setStatus,
    excludedStatuses,
    setExcludedStatuses,
    priority,
    setPriority,
    excludedPriorities,
    setExcludedPriorities,
    visibility,
    setVisibility,
    sort,
    setSort,
    clock,
    clear,
    dueWithin,
    setDueWithin,
    excludedDueWithin,
    setExcludedDueWithin,
  };
}
