"use client";

import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  AnimatedCollapse,
  ConfirmationDialog,
  IconButton,
  toast,
} from "@ryanmeetup/ui";
import { FiChevronDown, FiLoader, FiPlus } from "react-icons/fi";
import { useQueryParamState, useSearchFilter } from "@ryanmeetup/hooks";
import type { Task, WorkspaceData } from "@/lib/types";
import { WorkspacePageShell } from "@/components/global";
import { TaskEditor } from "./TaskEditor";
import {
  emptyNewTaskDetails,
  type NewTaskDetailsDraft,
} from "./NewTaskDetails";
import { persistNewTaskDetails } from "@/lib/new-task-details";
import { TaskFilters } from "./TaskFilters";
import { TaskListView } from "./TaskListView";
import { TaskWorkspaceHeader } from "./TaskWorkspaceHeader";
import { TaskBoardCard } from "./TaskBoardCard";
import { CategoriesModal } from "@/components/categories";
import { ProjectsModal } from "@/components/projects";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { usePagination } from "@/hooks/usePagination";
import { useCollapsedStatuses } from "@/hooks/useCollapsedStatuses";
import { useBoardAutoScroll } from "@/hooks/useBoardAutoScroll";
import {
  createTaskMutationService,
  type TaskDraft,
} from "@/lib/task-mutations";
import { taskKey } from "@/lib/task-key";
import { errorMessage, profileDisplayName } from "@/lib/presentation";
import { emptyTaskDraft, taskDraftFromTask } from "@/lib/task-draft-factory";
import { BoardColumnTasks } from "./BoardColumnTasks";
import {
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
import {
  deleteTaskDraft,
  draftSavedStatus,
  hasDraftAutosaveContent,
  hasDraftContent,
  saveTaskDraft,
  taskDraftAutosaveDelayMs,
} from "@/lib/task-drafts";

export { StatusSettingsModal } from "./TaskAdministration";

type View = "board" | "list";
type Draft = TaskDraft;
function editDraft(task: Task, categoryIds: string[]): Draft {
  return {
    ...taskDraftFromTask(task, categoryIds),
    start_date: null,
    due_time: null,
  };
}

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
  const [taskOpen, setTaskOpen] = useState(Boolean(initialEditing));
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(
    Boolean(initialEditing) &&
      initialData.currentProfile.task_details_open_by_default,
  );
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoryEditId, setCategoryEditId] = useState<string | null>(null);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [projectEditId, setProjectEditId] = useState<string | null>(null);
  const [taskMessage, setTaskMessage] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);
  const [newTaskDetails, setNewTaskDetails] =
    useState<NewTaskDetailsDraft>(emptyNewTaskDetails);
  const [createAnother, setCreateAnother] = useState(false);
  const draftId = useRef<string | null>(null);
  const draftTouched = useRef(false);
  const taskSaveInFlight = useRef(false);
  const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null);
  const [taskDeleting, setTaskDeleting] = useState(false);
  const [taskPageLoading, setTaskPageLoading] = useState(false);
  const loadedTaskQuery = useRef("");
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<{
    taskId: string;
    edge: "before" | "after";
  } | null>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<Task | null>(initialEditing);
  const [draft, setDraft] = useState<Draft>(
    initialEditing
      ? editDraft(
          initialEditing,
          initialData.taskCategories
            .filter((item) => item.task_id === initialEditing.id)
            .map((item) => item.category_id),
        )
      : emptyTaskDraft(
          initialData.statuses[1]?.id ?? initialData.statuses[0]?.id ?? "",
          initialData.currentProfile.id,
        ),
  );

  useEffect(() => {
    if (
      !taskOpen ||
      taskSaving ||
      editing ||
      !draftTouched.current ||
      !hasDraftAutosaveContent(draft)
    )
      return;
    const timer = window.setTimeout(() => {
      const saved = saveTaskDraft(
        data.currentProfile.id,
        draft,
        draftId.current ?? undefined,
      );
      draftId.current = saved.id;
      toast.success(draftSavedStatus("auto"), {
        id: `task-draft-autosave-${data.currentProfile.id}`,
        duration: 2500,
      });
    }, taskDraftAutosaveDelayMs);
    return () => window.clearTimeout(timer);
  }, [data.currentProfile.id, draft, editing, taskOpen, taskSaving]);

  useBoardAutoScroll(Boolean(draggedTaskId), boardScrollRef);
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
  const selectedCategory =
    group === "all"
      ? null
      : (categories.get(group) ??
        data.categories.find((item) => item.name === group));
  const includedCategoryIds = useMemo(() => {
    const ids = includedCategories
      .split(",")
      .filter(Boolean)
      .flatMap((value) => {
        const category =
          categories.get(value) ??
          data.categories.find((item) => item.name === value);
        return category ? [category.id] : [];
      });
    if (selectedCategory && !ids.includes(selectedCategory.id))
      ids.push(selectedCategory.id);
    return ids;
  }, [categories, data.categories, includedCategories, selectedCategory]);
  const excludedCategoryIds = useMemo(
    () =>
      excludedCategories
        .split(",")
        .filter(Boolean)
        .flatMap((value) => {
          const category =
            categories.get(value) ??
            data.categories.find((item) => item.name === value);
          return category ? [category.id] : [];
        }),
    [categories, data.categories, excludedCategories],
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
      includedAssigneeIds,
      includedCategoryIds,
      includedDueValues,
      includedPriorityValues,
      includedProjectIds,
      includedReporterIds,
      includedStatusIds,
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

  function openCreate(statusId?: string) {
    setTaskMessage("");
    setEditing(null);
    setTaskDetailsOpen(false);
    setCreateAnother(false);
    draftId.current = null;
    setNewTaskDetails(emptyNewTaskDetails());
    draftTouched.current = false;
    const scopedDraft = emptyTaskDraft(
      statusId ??
        selectedStatus?.id ??
        statuses[1]?.id ??
        statuses[0]?.id ??
        "",
      data.currentProfile.id,
    );
    scopedDraft.category_ids =
      includedCategoryIds.length === 1 ? [...includedCategoryIds] : [];
    scopedDraft.project_id = selectedProject?.id ?? null;
    scopedDraft.assignee_id = selectedAssignee?.id ?? null;
    scopedDraft.priority = selectedPriority ?? "medium";
    setDraft(scopedDraft);
    setTaskOpen(true);
  }

  function updateDraft(nextDraft: SetStateAction<Draft>) {
    draftTouched.current = true;
    setDraft(nextDraft);
  }

  function openEdit(task: Task) {
    setTaskMessage("");
    setEditing(task);
    setTaskDetailsOpen(data.currentProfile.task_details_open_by_default);
    setCreateAnother(false);
    draftId.current = null;
    setDraft(editDraft(task, [...(categoriesByTask.get(task.id) ?? [])]));
    setTaskOpen(true);
  }

  function saveAsDraft() {
    if (!hasDraftContent(draft)) {
      toast.error("Add a title or a few details before saving a draft.");
      return;
    }
    const saved = saveTaskDraft(
      data.currentProfile.id,
      draft,
      draftId.current ?? undefined,
    );
    draftId.current = saved.id;
    toast.success(draftSavedStatus("manual"));
    setTaskOpen(false);
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (taskSaveInFlight.current) return;
    const validationMessage = !draft.title.trim()
      ? "A task title is required."
      : !draft.status_id
        ? "A status is required."
        : !draft.priority
          ? "A priority is required."
          : draft.category_ids.length === 0
            ? "Select at least one category."
            : null;
    if (validationMessage) {
      setTaskMessage(validationMessage);
      toast.error(validationMessage);
      queueMicrotask(() => setTaskOpen(true));
      return;
    }
    setTaskMessage("");
    taskSaveInFlight.current = true;
    setTaskSaving(true);
    try {
      const saved = await mutations.save(draft, editing);
      mutations.applySaved(saved, Boolean(editing));
      let detailFailures = 0;
      if (!editing) {
        detailFailures = await persistNewTaskDetails({
          taskId: saved.task.id,
          draft: newTaskDetails,
          demoMode,
          setData,
        });
        setNewTaskDetails(emptyNewTaskDetails());
      }
      if (!editing && draftId.current) {
        deleteTaskDraft(data.currentProfile.id, draftId.current);
        draftId.current = null;
      }
      if (!demoMode && view === "list") await loadTaskPage(true);
      if (!editing && createAnother) {
        draftTouched.current = false;
        setDraft({
          ...emptyTaskDraft(draft.status_id, data.currentProfile.id),
          priority: draft.priority,
          category_ids: [...draft.category_ids],
          project_id: draft.project_id,
          assignee_id: draft.assignee_id,
        });
        toast.success("Task created. Add the next one.");
        if (detailFailures > 0)
          toast.error(
            `${detailFailures} ${detailFailures === 1 ? "task detail" : "task details"} could not be added.`,
          );
        return;
      }
      setTaskOpen(false);
      const movedToStatus = editing
        ? data.statuses.find(
            (item) =>
              item.id === draft.status_id && item.id !== editing.status_id,
          )
        : null;
      toast.success(
        movedToStatus
          ? `Task moved to ${movedToStatus.name}.`
          : editing
            ? "Task updated."
            : "Task created.",
      );
      if (detailFailures > 0)
        toast.error(
          `${detailFailures} ${detailFailures === 1 ? "task detail" : "task details"} could not be added. Open the task to retry.`,
        );
    } catch (error) {
      const message = errorMessage(error, "The task could not be saved.");
      setTaskMessage(message);
      toast.error(message);
    } finally {
      taskSaveInFlight.current = false;
      setTaskSaving(false);
    }
  }

  async function removeTask(id: string) {
    setTaskDeleting(true);
    try {
      await mutations.remove(id);
      if (!demoMode && view === "list") await loadTaskPage(true);
      setTaskPendingDelete(null);
      setTaskOpen(false);
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
    (visibility === "archived" ? 1 : 0);
  const taskCard = (task: Task) => {
    const taskStatus = data.statuses.find((item) => item.id === task.status_id);
    const taskCategories = [...(categoriesByTask.get(task.id) ?? [])]
      .map((id) => categories.get(id))
      .filter((item) => item !== undefined);
    const taskProject = task.project_id ? projects.get(task.project_id) : null;
    const taskPeople = [...(assigneesByTask.get(task.id) ?? [])]
      .map((id) => profiles.get(id))
      .filter((person) => person !== undefined);
    const taskSubtasks = data.subtasks.filter(
      (item) => item.task_id === task.id,
    );
    return (
      <TaskBoardCard
        task={task}
        status={taskStatus}
        categories={taskCategories}
        people={taskPeople}
        project={taskProject}
        subtasks={taskSubtasks}
        draggedTaskId={draggedTaskId}
        dropTarget={dragTarget}
        onDragStart={setDraggedTaskId}
        onDragOver={(draggedOverTask, edge) => {
          setDragOverStatusId(draggedOverTask.status_id);
          setDragTarget({
            taskId: draggedOverTask.id,
            edge,
          });
        }}
        onDrop={(dropTask, id, edge) => {
          setDragOverStatusId(null);
          setDragTarget(null);
          setDraggedTaskId(null);
          void moveTask(id, dropTask.status_id, dropTask.id, edge);
        }}
        onDragEnd={() => {
          setDragOverStatusId(null);
          setDragTarget(null);
          setDraggedTaskId(null);
        }}
        onOpen={openEdit}
      />
    );
  };

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
        onNewTask={() => openCreate()}
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
              categories: data.categories,
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
                const value = values.length
                  ? values.join(",")
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
                <div
                  ref={boardScrollRef}
                  className="-mx-4 flex flex-nowrap items-start gap-4 overflow-x-auto overscroll-x-contain px-4 pb-5 scroll-px-4 sm:mx-0 sm:px-0 sm:scroll-px-0"
                >
                  {statuses.map((item) => {
                    const columnTasks = visibleTasks.filter(
                      (task) => task.status_id === item.id,
                    );
                    const isCollapsed =
                      collapsedStatusIds?.has(item.id) ?? false;
                    const columnSizeClass = isCollapsed
                      ? "min-h-0 w-[240px]"
                      : "min-h-0 w-[min(320px,calc(100vw-3rem))]";
                    return (
                      <section
                        key={item.id}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          setDragOverStatusId(item.id);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDragLeave={(event) => {
                          const nextTarget = event.relatedTarget;
                          if (
                            !(nextTarget instanceof Node) ||
                            !event.currentTarget.contains(nextTarget)
                          ) {
                            setDragOverStatusId((current) =>
                              current === item.id ? null : current,
                            );
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          setDragOverStatusId(null);
                          setDragTarget(null);
                          setDraggedTaskId(null);
                          void moveTask(
                            event.dataTransfer.getData("text/task-id"),
                            item.id,
                          );
                        }}
                        className={`${columnSizeClass} shrink-0 rounded-2xl p-3 transition-[width,background-color,box-shadow] ${
                          dragOverStatusId === item.id
                            ? "bg-black/[0.07] ring-2 ring-inset ring-black/30 dark:bg-white/[0.09] dark:ring-white/40"
                            : "bg-black/[0.035] dark:bg-white/[0.035]"
                        }`}
                      >
                        <div className="flex items-center gap-2 px-1">
                          <i
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <h2 className="shrink-0 whitespace-nowrap text-xs font-bold uppercase tracking-[0.16em]">
                            {item.name}
                          </h2>
                          <span className="text-xs text-black/40 dark:text-white/40">
                            {columnTasks.length}
                          </span>
                          <IconButton
                            label={`Add task to “${item.name}”`}
                            tooltipTriggerClassName="ml-auto"
                            onClick={() => openCreate(item.id)}
                          >
                            <FiPlus />
                          </IconButton>
                          <IconButton
                            label={`${isCollapsed ? "Expand" : "Collapse"} “${item.name}”`}
                            aria-expanded={!isCollapsed}
                            aria-controls={`status-column-${item.id}`}
                            onClick={() => toggleStatusSection(item.id)}
                          >
                            <FiChevronDown
                              className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                            />
                          </IconButton>
                        </div>
                        {!isCollapsed && item.description && (
                          <p className="mt-2 px-1 text-sm leading-snug text-black/60 dark:text-white/60">
                            {item.description}
                          </p>
                        )}
                        <AnimatedCollapse
                          id={`status-column-${item.id}`}
                          open={!isCollapsed}
                          className={isCollapsed ? "" : "mt-3"}
                        >
                          <BoardColumnTasks
                            statusId={item.id}
                            statusName={item.name}
                            tasks={columnTasks}
                            renderTask={taskCard}
                            onCreate={() => openCreate(item.id)}
                          />
                        </AnimatedCollapse>
                      </section>
                    );
                  })}
                </div>
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
                  onOpenTask={openEdit}
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
        modal={{
          open: taskOpen,
          setOpen: setTaskOpen,
          detailsOpen: taskDetailsOpen,
          setDetailsOpen: setTaskDetailsOpen,
        }}
        form={{
          draft,
          setDraft: updateDraft,
          saving: taskSaving,
          message: taskMessage,
          onSubmit: saveTask,
        }}
        workspace={{ statuses, data, setData, demoMode }}
        mode={
          editing
            ? {
                kind: "edit",
                task: editing,
                onDelete: setTaskPendingDelete,
              }
            : {
                kind: "create",
                createAnother,
                setCreateAnother,
                details: newTaskDetails,
                setDetails: setNewTaskDetails,
                onSaveDraft: saveAsDraft,
              }
        }
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
