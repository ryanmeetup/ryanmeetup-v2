"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@ryanmeetup/ui";
import type { Task } from "@/lib/tasks/task-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import {
  buildTaskQueryParams,
  taskQuerySignature as buildTaskQuerySignature,
  type TaskQueryFilters,
} from "@/lib/tasks/task-query";
import { errorMessage } from "@/lib/presentation";

type TaskPageResponse = {
  error?: string;
  tasks?: Task[];
  taskAssignees?: WorkspaceData["taskAssignees"];
  taskCategories?: WorkspaceData["taskCategories"];
  taskLabels?: WorkspaceData["taskLabels"];
  page?: NonNullable<WorkspaceData["taskPage"]>;
};

/**
 * Owns the authoritative task fetch: it refetches whenever the query the URL
 * describes changes, and hands back a loader the mutation handlers call so a
 * paginated list reflects a write immediately.
 */
export function useTaskPageLoader({
  demoMode,
  preview,
  setData,
  filters,
  page,
  pageSize,
  setPage,
  syncPage,
  syncPageSize,
  search,
  sort,
  view,
  visibility,
}: {
  demoMode: boolean;
  preview: WorkspaceData["accessPreview"];
  setData: React.Dispatch<React.SetStateAction<WorkspaceData>>;
  filters: TaskQueryFilters;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  syncPage: (page: number) => void;
  syncPageSize: (pageSize: number) => void;
  search: string;
  sort: string;
  view: "board" | "list";
  visibility: "active" | "archived";
}) {
  const [loading, setLoading] = useState(false);
  const loadedTaskQuery = useRef("");

  async function loadTaskPage(replace = false) {
    if (demoMode || loading) return;
    setLoading(true);
    try {
      const params = buildTaskQueryParams({
        filters,
        page,
        pageSize,
        preview,
        search,
        sort,
        view,
        visibility,
      });
      const response = await fetch(`/api/tasks?${params}`);
      const result = (await response.json()) as TaskPageResponse;
      if (!response.ok || !result.tasks || !result.page)
        throw new Error(result.error ?? "Tasks could not be loaded.");
      setData((current) => {
        const ids = new Set(result.tasks!.map((task) => task.id));
        const mergeRows = <T extends { task_id: string }>(
          oldRows: T[],
          rows: T[],
        ) =>
          replace
            ? rows
            : [...oldRows.filter((row) => !ids.has(row.task_id)), ...rows];
        return {
          ...current,
          tasks:
            replace || view === "list"
              ? result.tasks!
              : [
                  ...current.tasks,
                  ...result.tasks!.filter(
                    (task) =>
                      !current.tasks.some((item) => item.id === task.id),
                  ),
                ],
          taskAssignees: mergeRows(
            current.taskAssignees,
            result.taskAssignees ?? [],
          ),
          taskCategories: mergeRows(
            current.taskCategories,
            result.taskCategories ?? [],
          ),
          taskLabels: mergeRows(current.taskLabels, result.taskLabels ?? []),
          taskPage: view === "list" ? result.page : undefined,
        };
      });
      if (view === "list") {
        syncPage(result.page.page);
        syncPageSize(result.page.pageSize);
      }
    } catch (error) {
      toast.error(errorMessage(error, "Tasks could not be loaded."));
    } finally {
      setLoading(false);
    }
  }

  const taskQuerySignature = buildTaskQuerySignature({
    filters,
    pageSize,
    search,
    sort,
    view,
    visibility,
  });
  useEffect(() => {
    if (demoMode) return;
    if (
      view === "list" &&
      loadedTaskQuery.current &&
      loadedTaskQuery.current !== taskQuerySignature &&
      page !== 1
    ) {
      loadedTaskQuery.current = taskQuerySignature;
      setPage(1);
      return;
    }
    loadedTaskQuery.current = taskQuerySignature;
    void loadTaskPage(true);
    // Query values are normalized above; fetching from this signature keeps
    // URL pagination and the authoritative server result in sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, page, taskQuerySignature, view]);

  return { loading, loadTaskPage };
}
