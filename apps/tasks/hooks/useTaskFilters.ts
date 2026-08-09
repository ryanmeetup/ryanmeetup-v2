"use client";

import { useEffect, useState } from "react";
import { useQueryParamState } from "@ryanmeetup/hooks";

export function useTaskFilters(setSearch: (value: string) => void) {
  const [assignee, setAssignee] = useQueryParamState("assignee", "all");
  const [reporter, setReporter] = useQueryParamState("reporter", "all");
  const [group, setGroup] = useQueryParamState("category", "all");
  const [project, setProject] = useQueryParamState("project", "all");
  const [status, setStatus] = useQueryParamState("status", "all");
  const [priority, setPriority] = useQueryParamState("priority", "all");
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
    setProject("all");
    setStatus("all");
    setPriority("all");
    setVisibility("active");
  }

  return {
    assignee, setAssignee, reporter, setReporter, group, setGroup, project, setProject, status, setStatus,
    priority, setPriority, visibility, setVisibility, sort, setSort, clock, clear,
  };
}
