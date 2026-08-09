"use client";

import { useEffect, useState } from "react";
import { useQueryParamState } from "@ryanmeetup/hooks";

export function useTaskFilters(setSearch: (value: string) => void) {
  const [assignee, setAssignee] = useQueryParamState("assignee", "all");
  const [reporter, setReporter] = useQueryParamState("reporter", "all");
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
  const [status, setStatus] = useQueryParamState("status", "all");
  const [priority, setPriority] = useQueryParamState("priority", "all");
  const [dueWithin, setDueWithin] = useQueryParamState("dueWithin", "all");
  const [involved, setInvolved] = useQueryParamState("involved", "all");
  const [visibilityParam, setVisibility] = useQueryParamState("visibility", "active");
  const visibility: "active" | "archived" =
    visibilityParam === "archived" ? "archived" : "active";
  const [sort, setSort] = useState("updated");
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function clear() {
    setSearch("");
    setAssignee("all");
    setReporter("all");
    setGroup("all");
    setIncludedCategories("");
    setExcludedCategories("");
    setProject("all");
    setStatus("all");
    setPriority("all");
    setDueWithin("all");
    setInvolved("all");
    setVisibility("active");
  }

  return {
    assignee, setAssignee, reporter, setReporter, group, setGroup,
    includedCategories, setIncludedCategories, excludedCategories, setExcludedCategories,
    project, setProject, status, setStatus,
    priority, setPriority, visibility, setVisibility, sort, setSort, clock, clear,
    dueWithin,
    setDueWithin,
    involved,
    setInvolved,
  };
}
