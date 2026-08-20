"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmationDialog, toast } from "@ryanmeetup/ui";
import { FiLoader } from "react-icons/fi";
import { useQueryParamState, useSearchFilter } from "@ryanmeetup/hooks";
import type { Task } from "@/lib/task-types";
import type { WorkspaceData } from "@/lib/workspace-types";
import { WorkspacePageShell } from "@/components/global";
import { TaskEditor } from "./TaskEditor";
import { TaskFilters } from "./TaskFilters";
import { TaskListView } from "./TaskListView";
import { TaskWorkspaceHeader } from "./TaskWorkspaceHeader";
import { CategoriesModal } from "@/components/categories";
import { ProjectsModal } from "@/components/projects";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { usePagination } from "@/hooks/usePagination";
import { useCollapsedStatuses } from "@/hooks/useCollapsedStatuses";
import { useBoardAutoScroll } from "@/hooks/useBoardAutoScroll";
import { createTaskMutationService } from "@/lib/task-mutations";
import { taskKey } from "@/lib/task-key";
import { errorMessage, profileDisplayName } from "@/lib/presentation";
import {
  categoryTagFilterValue,
  parseCategoryTagFilterValue,
  resolveCategoryTagFilters,
  resolveDueFilterValues,
  resolveEntityFilterIds,
  resolvePriorityFilterValues,
  resolveProfileFilterIds,
} from "@/lib/task-filter-values";
import {
  deriveVisibleTasks,
  indexTaskAssignees,
  indexTaskCategories,
} from "@/lib/task-view";
import {
  buildTaskQueryParams,
  taskQuerySignature as buildTaskQuerySignature,
  type TaskQueryFilters,
} from "@/lib/task-query";
import { parseTaskKey } from "@/lib/task-key";
import { useTaskEditorController } from "@/hooks/useTaskEditorController";
import { useTaskBoardDrag } from "@/hooks/useTaskBoardDrag";
import { TaskBoardView } from "./TaskBoardView";

export { StatusSettingsModal } from "./TaskAdministration";

type View = "board" | "list";
export function TaskApp({
  initialData,
  demoMode,
  initialTaskId,
}: {
  initialData: WorkspaceData;
  demoMode: boolean;
  initialTaskId?: string;
}) {
  const initialTaskNumber = initialTaskId ? parseTaskKey(initialTaskId) : null;
  const initialEditing = initialTaskId
    ? (initialData.tasks.find(
        (task) =>
          task.id === initialTaskId || task.task_number === initialTaskNumber,
      ) ?? null)
    : null;
  const { data, setData, getData } = useWorkspaceData(initialData, demoMode);
  const mutations = useMemo(
    () => createTaskMutationService({ demoMode, getData, setData }),
    [demoMode, getData, setData],
  );
  const [viewParam, setView] = useQueryParamState("view", "board");
  const view: View = viewParam === "list" ? "list" : "board";
  const [committedSearch] = useQueryParamState("q", "");
  const { page, pageSize, setPage, setPageSize, syncPage, syncPageSize } =
    usePagination();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoryEditId, setCategoryEditId] = useState<string | null>(null);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [projectEditId, setProjectEditId] = useState<string | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null);
  const [taskDeleting, setTaskDeleting] = useState(false);
  const [taskPageLoading, setTaskPageLoading] = useState(false);
  const loadedTaskQuery = useRef("");
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const {
    setQuery: setSearch,
    filtered: searchedTasks,
    isPending: searchPending,
  } = useSearchFilter({
    data: data.tasks,
    buildHaystack: (task) =>
      `${taskKey(task)} ${task.title} ${task.description ?? ""}`.toLowerCase(),
  });
  const {
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
    dueWithin,
    setDueWithin,
    excludedDueWithin,
    setExcludedDueWithin,
    tags,
    setTags,
    excludedTags,
    setExcludedTags,
    visibility,
    setVisibility,
    sort,
    setSort,
    clock,
    clear: clearTaskFilters,
  } = useTaskFilters(setSearch);
  const { collapsedStatusIds, toggleStatusSection } = useCollapsedStatuses();

  const profiles = useMemo(
    () => new Map(data.profiles.map((item) => [item.id, item])),
    [data.profiles],
  );
  const categories = useMemo(
    () => new Map(data.categories.map((item) => [item.id, item])),
    [data.categories],
  );
  const accessibleCategoryIds = useMemo(
    () =>
      data.accessPreview?.accessibleCategoryIds
        ? new Set(data.accessPreview.accessibleCategoryIds)
        : null,
    [data.accessPreview],
  );
  const accessibleCategories = useMemo(
    () =>
      accessibleCategoryIds
        ? data.categories.filter((item) => accessibleCategoryIds.has(item.id))
        : data.categories,
    [accessibleCategoryIds, data.categories],
  );
  const statuses = useMemo(
    () => [...data.statuses].sort((a, b) => a.sort_order - b.sort_order),
    [data.statuses],
  );
  const projects = useMemo(
    () => new Map(data.projects.map((item) => [item.id, item])),
    [data.projects],
  );
  const includedAssigneeIds = resolveProfileFilterIds(
    assignee,
    data.profiles,
    true,
  );
  const excludedAssigneeIds = resolveProfileFilterIds(
    excludedAssignees,
    data.profiles,
    true,
  );
  const includedReporterIds = resolveProfileFilterIds(reporter, data.profiles);
  const excludedReporterIds = resolveProfileFilterIds(
    excludedReporters,
    data.profiles,
  );
  const selectedAssignee = profiles.get(includedAssigneeIds[0] ?? "") ?? null;
  const selectedReporter = profiles.get(includedReporterIds[0] ?? "") ?? null;
  const requestedCategory =
    group === "all"
      ? null
      : (categories.get(group) ??
        data.categories.find((item) => item.name === group));
  const selectedCategory =
    requestedCategory &&
    (!accessibleCategoryIds || accessibleCategoryIds.has(requestedCategory.id))
      ? requestedCategory
      : null;
  const includedCategoryIds = useMemo(() => {
    const ids = includedCategories
      .split(",")
      .filter(Boolean)
      .flatMap((value) => {
        const category =
          categories.get(value) ??
          data.categories.find((item) => item.name === value);
        return category &&
          (!accessibleCategoryIds || accessibleCategoryIds.has(category.id))
          ? [category.id]
          : [];
      });
    if (selectedCategory && !ids.includes(selectedCategory.id))
      ids.push(selectedCategory.id);
    return ids;
  }, [
    accessibleCategoryIds,
    categories,
    data.categories,
    includedCategories,
    selectedCategory,
  ]);
  const excludedCategoryIds = useMemo(
    () =>
      excludedCategories
        .split(",")
        .filter(Boolean)
        .flatMap((value) => {
          const category =
            categories.get(value) ??
            data.categories.find((item) => item.name === value);
          return category &&
            (!accessibleCategoryIds || accessibleCategoryIds.has(category.id))
            ? [category.id]
            : [];
        }),
    [accessibleCategoryIds, categories, data.categories, excludedCategories],
  );
  const categoryNames = useCallback(
    (ids: string[]) =>
      ids
        .flatMap((id) => {
          const category = categories.get(id);
          return category ? [category.name] : [];
        })
        .join(","),
    [categories],
  );
  const includedProjectIds = resolveEntityFilterIds(
    project,
    data.projects,
    true,
  );
  const excludedProjectIds = resolveEntityFilterIds(
    excludedProjects,
    data.projects,
    true,
  );
  const includedStatusIds = resolveEntityFilterIds(status, data.statuses);
  const excludedStatusIds = resolveEntityFilterIds(
    excludedStatuses,
    data.statuses,
  );
  const includedPriorityValues = resolvePriorityFilterValues(priority);
  const excludedPriorityValues =
    resolvePriorityFilterValues(excludedPriorities);
  const includedDueValues = resolveDueFilterValues(dueWithin);
  const excludedDueValues = resolveDueFilterValues(excludedDueWithin);
  const includedTagFilters = resolveCategoryTagFilters(tags, data.categories);
  const excludedTagFilters = resolveCategoryTagFilters(
    excludedTags,
    data.categories,
  );
  const selectedProject = projects.get(includedProjectIds[0] ?? "") ?? null;
  const selectedProjectOwners = selectedProject
    ? data.projectOwners
        .filter((item) => item.project_id === selectedProject.id)
        .flatMap((item) => {
          const profile = data.profiles.find(
            (candidate) => candidate.id === item.profile_id,
          );
          return profile ? [profile] : [];
        })
    : [];
  const selectedStatus =
    data.statuses.find((item) => item.id === includedStatusIds[0]) ?? null;
  const selectedPriority = includedPriorityValues[0] ?? null;
  const taskQueryFilters: TaskQueryFilters = {
    statuses: includedStatusIds,
    excludedStatuses: excludedStatusIds,
    projects: includedProjectIds,
    excludedProjects: excludedProjectIds,
    assignees: includedAssigneeIds,
    excludedAssignees: excludedAssigneeIds,
    reporters: includedReporterIds,
    excludedReporters: excludedReporterIds,
    categories: includedCategoryIds,
    excludedCategories: excludedCategoryIds,
    priorities: includedPriorityValues,
    excludedPriorities: excludedPriorityValues,
    dueWithin: includedDueValues,
    excludedDueWithin: excludedDueValues,
    tags: includedTagFilters,
    excludedTags: excludedTagFilters,
  };
  async function loadTaskPage(replace = false) {
    if (demoMode || taskPageLoading) return;
    setTaskPageLoading(true);
    try {
      const params = buildTaskQueryParams({
        filters: taskQueryFilters,
        page,
        pageSize,
        preview: data.accessPreview,
        search: committedSearch,
        sort,
        view,
        visibility,
      });
      const response = await fetch(`/api/tasks?${params}`);
      const result = (await response.json()) as {
        error?: string;
        tasks?: Task[];
        taskAssignees?: WorkspaceData["taskAssignees"];
        taskCategories?: WorkspaceData["taskCategories"];
        taskLabels?: WorkspaceData["taskLabels"];
        page?: NonNullable<WorkspaceData["taskPage"]>;
      };
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
      setTaskPageLoading(false);
    }
  }

  const taskQuerySignature = buildTaskQuerySignature({
    filters: taskQueryFilters,
    pageSize,
    search: committedSearch,
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
  useEffect(() => {
    if (assignee !== "all" && profiles.has(assignee) && selectedAssignee) {
      setAssignee(profileDisplayName(selectedAssignee));
    } else if (assignee === "unassigned") {
      setAssignee("Unassigned");
    }
  }, [assignee, profiles, selectedAssignee, setAssignee]);
  useEffect(() => {
    if (reporter !== "all" && profiles.has(reporter) && selectedReporter) {
      setReporter(profileDisplayName(selectedReporter));
    }
  }, [profiles, reporter, selectedReporter, setReporter]);
  useEffect(() => {
    const readable = excludedAssigneeIds
      .map((id) =>
        id === "unassigned"
          ? "Unassigned"
          : profileDisplayName(profiles.get(id)),
      )
      .join(",");
    if (excludedAssignees && excludedAssignees !== readable)
      setExcludedAssignees(readable);
  }, [excludedAssigneeIds, excludedAssignees, profiles, setExcludedAssignees]);
  useEffect(() => {
    const readable = excludedReporterIds
      .map((id) => profileDisplayName(profiles.get(id)))
      .join(",");
    if (excludedReporters && excludedReporters !== readable)
      setExcludedReporters(readable);
  }, [excludedReporterIds, excludedReporters, profiles, setExcludedReporters]);
  useEffect(() => {
    if (group !== "all" && categories.has(group) && selectedCategory)
      setGroup(selectedCategory.name);
  }, [categories, group, selectedCategory, setGroup]);
  useEffect(() => {
    if (
      project !== "all" &&
      project !== "none" &&
      projects.has(project) &&
      selectedProject
    )
      setProject(selectedProject.name);
  }, [project, projects, selectedProject, setProject]);
  useEffect(() => {
    const readable = excludedProjectIds
      .map((id) => (id === "none" ? "none" : (projects.get(id)?.name ?? "")))
      .filter(Boolean)
      .join(",");
    if (excludedProjects && excludedProjects !== readable)
      setExcludedProjects(readable);
  }, [excludedProjectIds, excludedProjects, projects, setExcludedProjects]);
  useEffect(() => {
    const readableIncluded = categoryNames(includedCategoryIds);
    const readableExcluded = categoryNames(excludedCategoryIds);
    if (includedCategories && includedCategories !== readableIncluded)
      setIncludedCategories(readableIncluded);
    if (excludedCategories && excludedCategories !== readableExcluded)
      setExcludedCategories(readableExcluded);
  }, [
    categoryNames,
    excludedCategories,
    excludedCategoryIds,
    includedCategories,
    includedCategoryIds,
    setExcludedCategories,
    setIncludedCategories,
  ]);
  useEffect(() => {
    if (status !== "all" && selectedStatus && status !== selectedStatus.name) {
      setStatus(selectedStatus.name);
    }
  }, [selectedStatus, setStatus, status]);
  useEffect(() => {
    const readable = excludedStatusIds
      .map((id) => data.statuses.find((item) => item.id === id)?.name ?? "")
      .filter(Boolean)
      .join(",");
    if (excludedStatuses && excludedStatuses !== readable)
      setExcludedStatuses(readable);
  }, [data.statuses, excludedStatusIds, excludedStatuses, setExcludedStatuses]);
  useEffect(() => {
    if (selectedPriority) {
      const readablePriority =
        selectedPriority[0].toUpperCase() + selectedPriority.slice(1);
      if (priority !== readablePriority) setPriority(readablePriority);
    }
  }, [priority, selectedPriority, setPriority]);
  const viewingAsGroup = data.accessPreview?.kind === "group";
  const myTasksProfile =
    data.accessPreview?.kind === "user"
      ? data.profiles.find(
          (profile) => profile.id === data.accessPreview?.subjectId,
        )
      : data.currentProfile;
  const myTasksName =
    myTasksProfile?.full_name ?? data.accessPreview?.subjectName ?? "";
  const isMyTasks =
    !viewingAsGroup && selectedAssignee?.id === myTasksProfile?.id;
  const scopeName = selectedProject?.name ?? selectedCategory?.name;
  const scopeDescription =
    selectedProject?.description ?? selectedCategory?.description;
  const taskScopeTitle = scopeName
    ? `${scopeName}${isMyTasks ? " · My Tasks" : ""}`
    : isMyTasks
      ? "My Tasks"
      : "All Tasks";
  const viewTitle =
    visibility === "archived" ? `${taskScopeTitle} · Archived` : taskScopeTitle;
  useEffect(() => {
    document.title = `${viewTitle} | Ryan Meetup Tasks`;
  }, [viewTitle]);
  const categoriesByTask = useMemo(
    () => indexTaskCategories(data.taskCategories),
    [data.taskCategories],
  );
  const assigneesByTask = useMemo(
    () => indexTaskAssignees(data.tasks, data.taskAssignees),
    [data.taskAssignees, data.tasks],
  );
  const visibleTasks = useMemo(
    () =>
      deriveVisibleTasks({
        categoriesByTask,
        clock,
        filters: {
          assignees: includedAssigneeIds,
          excludedAssignees: excludedAssigneeIds,
          reporters: includedReporterIds,
          excludedReporters: excludedReporterIds,
          categories: includedCategoryIds,
          excludedCategories: excludedCategoryIds,
          projects: includedProjectIds,
          excludedProjects: excludedProjectIds,
          statuses: includedStatusIds,
          excludedStatuses: excludedStatusIds,
          priorities: includedPriorityValues,
          excludedPriorities: excludedPriorityValues,
          dueWithin: includedDueValues,
          excludedDueWithin: excludedDueValues,
          tags: includedTagFilters,
          excludedTags: excludedTagFilters,
        },
        sort,
        tasks: searchedTasks,
        view,
        visibility,
      }),
    [
      categoriesByTask,
      clock,
      excludedAssigneeIds,
      excludedCategoryIds,
      excludedDueValues,
      excludedPriorityValues,
      excludedProjectIds,
      excludedReporterIds,
      excludedStatusIds,
      excludedTagFilters,
      includedAssigneeIds,
      includedCategoryIds,
      includedDueValues,
      includedPriorityValues,
      includedProjectIds,
      includedReporterIds,
      includedStatusIds,
      includedTagFilters,
      searchedTasks,
      sort,
      view,
      visibility,
    ],
  );
  const listTasks =
    view === "list" ? visibleTasks.slice(0, pageSize) : visibleTasks;
  const visibleTaskCount =
    view === "list"
      ? (data.taskPage?.totalCount ?? visibleTasks.length)
      : visibleTasks.length;

  const editor = useTaskEditorController({
    initialEditing,
    initialData,
    data,
    setData,
    demoMode,
    mutations,
    categoriesByTask,
    defaults: {
      statusId: selectedStatus?.id ?? statuses[1]?.id ?? statuses[0]?.id ?? "",
      categoryIds: includedCategoryIds,
      projectId: selectedProject?.id ?? null,
      assigneeId: selectedAssignee?.id ?? null,
      priority: selectedPriority ?? "medium",
    },
    afterSave: async () => {
      if (!demoMode) await loadTaskPage(true);
    },
  });

  async function removeTask(id: string) {
    setTaskDeleting(true);
    try {
      await mutations.remove(id);
      if (!demoMode && view === "list") await loadTaskPage(true);
      setTaskPendingDelete(null);
      editor.modal.setOpen(false);
      toast.success("Task deleted.");
    } catch (error) {
      toast.error(errorMessage(error, "The task could not be deleted."));
    } finally {
      setTaskDeleting(false);
    }
  }

  async function moveTask(
    id: string,
    statusId: string,
    targetId?: string,
    edge: "before" | "after" = "after",
  ) {
    const task = getData().tasks.find((item) => item.id === id);
    const destination = data.statuses.find((item) => item.id === statusId);
    const movedToNewColumn = Boolean(task && task.status_id !== statusId);
    try {
      await mutations.move(id, statusId, targetId, edge);
      if (!demoMode && view === "list") await loadTaskPage(true);
      if (movedToNewColumn && destination) {
        toast.success(`Task moved to ${destination.name}.`);
      }
    } catch (error) {
      toast.error(errorMessage(error, "The task could not be moved."));
    }
  }
  const boardDrag = useTaskBoardDrag(moveTask);
  useBoardAutoScroll(Boolean(boardDrag.state.draggedTaskId), boardScrollRef);
  const filterCount =
    (isMyTasks ? 0 : includedAssigneeIds.length) +
    excludedAssigneeIds.length +
    includedReporterIds.length +
    excludedReporterIds.length +
    includedProjectIds.length +
    excludedProjectIds.length +
    includedStatusIds.length +
    excludedStatusIds.length +
    includedPriorityValues.length +
    excludedPriorityValues.length +
    includedCategoryIds.length +
    excludedCategoryIds.length +
    includedDueValues.length +
    excludedDueValues.length +
    includedTagFilters.length +
    excludedTagFilters.length +
    (visibility === "archived" ? 1 : 0);
  return (
    <>
      <WorkspacePageShell
        data={data}
        demoMode={demoMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onCreateCategory={() => {
          setCategoryEditId(null);
          setCategoriesOpen(true);
        }}
        onCreateProject={() => {
          setProjectEditId(null);
          setProjectsOpen(true);
        }}
        onNewTask={() => editor.openCreate()}
        setData={setData}
      >
        {demoMode && (
          <div className="border-b border-amber-300/40 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Local demo mode · Add Supabase environment variables to enable team
            auth and realtime sync.
          </div>
        )}
        <div className="p-4 sm:p-6 lg:p-8">
          <TaskWorkspaceHeader
            scope={{
              assignee,
              demoMode,
              isMyTasks,
              myTasksName,
              previewing: Boolean(data.accessPreview),
              scopeDescription,
              selectedCategory,
              selectedProject,
              projectOwners: selectedProjectOwners,
              taskCount: visibleTaskCount,
              view,
              viewTitle,
              viewingAsGroup,
            }}
            controls={{
              onEditProject: () => {
                if (!selectedProject) return;
                setProjectEditId(selectedProject.id);
                setProjectsOpen(true);
              },
              onEditCategory: () => {
                if (!selectedCategory) return;
                setCategoryEditId(selectedCategory.id);
                setCategoriesOpen(true);
              },
              onSetAssignee: setAssignee,
              onSetView: setView,
            }}
          />
          <TaskFilters
            options={{
              categories: accessibleCategories,
              currentProfileId: data.currentProfile.id,
              profiles: data.profiles,
              projects: data.projects,
              statuses,
            }}
            controller={{
              count: filterCount,
              visibility,
              categories: {
                included: includedCategoryIds,
                excluded: excludedCategoryIds,
              },
              selections: {
                assignee: {
                  included: includedAssigneeIds,
                  excluded: excludedAssigneeIds,
                },
                reporter: {
                  included: includedReporterIds,
                  excluded: excludedReporterIds,
                },
                project: {
                  included: includedProjectIds,
                  excluded: excludedProjectIds,
                },
                status: {
                  included: includedStatusIds,
                  excluded: excludedStatusIds,
                },
                priority: {
                  included: includedPriorityValues,
                  excluded: excludedPriorityValues,
                },
                dueWithin: {
                  included: includedDueValues,
                  excluded: excludedDueValues,
                },
                tag: {
                  included: includedTagFilters.map(categoryTagFilterValue),
                  excluded: excludedTagFilters.map(categoryTagFilterValue),
                },
              },
              clear: clearTaskFilters,
              setVisibility,
              setCategories: (kind, ids) => {
                if (kind === "included") {
                  setGroup("all");
                  setIncludedCategories(categoryNames(ids));
                  setExcludedCategories(
                    categoryNames(
                      excludedCategoryIds.filter((id) => !ids.includes(id)),
                    ),
                  );
                  return;
                }
                setExcludedCategories(categoryNames(ids));
                setIncludedCategories(
                  categoryNames(
                    includedCategoryIds.filter((id) => !ids.includes(id)),
                  ),
                );
                if (selectedCategory && ids.includes(selectedCategory.id))
                  setGroup("all");
              },
              setSelection: (filter, kind, values) => {
                const readableValues = values.map((value) => {
                  if (filter === "assignee" || filter === "reporter")
                    return value === "unassigned"
                      ? "Unassigned"
                      : profileDisplayName(profiles.get(value));
                  if (filter === "project")
                    return value === "none"
                      ? value
                      : (projects.get(value)?.name ?? value);
                  if (filter === "status")
                    return (
                      data.statuses.find((item) => item.id === value)?.name ??
                      value
                    );
                  if (filter === "tag") {
                    const parsed = parseCategoryTagFilterValue(value);
                    const category = parsed
                      ? categories.get(parsed.categoryId)
                      : undefined;
                    return parsed && category
                      ? `${category.name}: ${parsed.tag}`
                      : value;
                  }
                  return value;
                });
                const value = readableValues.length
                  ? readableValues.join(",")
                  : kind === "included"
                    ? "all"
                    : "";
                const setters = {
                  assignee:
                    kind === "included" ? setAssignee : setExcludedAssignees,
                  reporter:
                    kind === "included" ? setReporter : setExcludedReporters,
                  project:
                    kind === "included" ? setProject : setExcludedProjects,
                  status: kind === "included" ? setStatus : setExcludedStatuses,
                  priority:
                    kind === "included" ? setPriority : setExcludedPriorities,
                  dueWithin:
                    kind === "included" ? setDueWithin : setExcludedDueWithin,
                  tag: kind === "included" ? setTags : setExcludedTags,
                };
                setters[filter](value);
              },
            }}
          />

          <div className="relative" aria-busy={searchPending}>
            {searchPending && (
              <div
                role="status"
                aria-label="Loading task results"
                className="absolute inset-0 z-10 grid min-h-56 place-items-center rounded-2xl bg-[#f7f7f5]/80 backdrop-blur-sm dark:bg-[#101010]/80"
              >
                <span className="flex items-center gap-3 rounded-2xl border border-black/15 bg-white px-6 py-4 text-base font-semibold shadow-lg dark:border-white/15 dark:bg-[#181818]">
                  <FiLoader className="h-6 w-6 animate-spin motion-reduce:animate-none" />
                  Loading tasks
                </span>
              </div>
            )}
            <div
              className={
                searchPending
                  ? "pointer-events-none opacity-55 transition-opacity"
                  : "transition-opacity"
              }
            >
              {view === "board" ? (
                <TaskBoardView
                  data={data}
                  tasks={visibleTasks}
                  statuses={statuses}
                  collapsedStatusIds={collapsedStatusIds}
                  scrollRef={boardScrollRef}
                  drag={boardDrag}
                  onToggleStatus={toggleStatusSection}
                  onCreate={editor.openCreate}
                  onOpen={editor.openEdit}
                />
              ) : (
                <TaskListView
                  data={{
                    assigneesByTask,
                    categories,
                    categoriesByTask,
                    profiles,
                    projects,
                    statuses,
                    tasks: listTasks,
                  }}
                  loading={taskPageLoading}
                  onOpenTask={editor.openEdit}
                  pagination={{
                    page: data.taskPage?.page ?? page,
                    pageSize: data.taskPage?.pageSize ?? pageSize,
                    totalCount:
                      data.taskPage?.totalCount ?? visibleTasks.length,
                    onPageChange: (nextPage) => {
                      setView("list");
                      setPage(nextPage);
                    },
                    onPageSizeChange: (nextPageSize) => {
                      setView("list");
                      setPageSize(nextPageSize);
                    },
                  }}
                  sorting={{
                    value: sort,
                    onChange: (nextSort) => {
                      setView("list");
                      setSort(nextSort);
                    },
                    onToggle: () => setSort(sort === "due" ? "updated" : "due"),
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </WorkspacePageShell>

      <TaskEditor
        controller={editor}
        workspace={{ statuses, data, setData, demoMode }}
        onDelete={setTaskPendingDelete}
      />
      <ConfirmationDialog
        open={Boolean(taskPendingDelete)}
        setOpen={(nextOpen) => {
          if (!nextOpen) setTaskPendingDelete(null);
        }}
        title="Delete task?"
        description="This task and its related comments, attachments, and activity will be permanently removed."
        confirmLabel="Delete task"
        pendingLabel="Deleting..."
        pending={taskDeleting}
        destructive
        onConfirm={() => {
          if (taskPendingDelete) void removeTask(taskPendingDelete.id);
        }}
      />
      {categoriesOpen && (
        <CategoriesModal
          modal={{
            open: categoriesOpen,
            setOpen: (nextOpen) => {
              setCategoriesOpen(nextOpen);
              if (!nextOpen) setCategoryEditId(null);
            },
          }}
          workspace={{ data, setData, demoMode }}
          options={{ editCategoryId: categoryEditId, createOnly: true }}
          events={{
            onCategoryUpdated: (updatedCategory) => {
              if (selectedCategory?.id === updatedCategory.id) {
                setGroup(updatedCategory.name);
                setIncludedCategories(updatedCategory.name);
              }
            },
          }}
        />
      )}
      {projectsOpen && (
        <ProjectsModal
          modal={{
            open: projectsOpen,
            setOpen: (nextOpen) => {
              setProjectsOpen(nextOpen);
              if (!nextOpen) setProjectEditId(null);
            },
          }}
          workspace={{ data, setData, demoMode }}
          options={{ editProjectId: projectEditId, createOnly: true }}
          events={{
            onProjectUpdated: (updatedProject) => {
              if (selectedProject?.id === updatedProject.id) {
                setProject(updatedProject.name);
              }
            },
          }}
        />
      )}
    </>
  );
}
