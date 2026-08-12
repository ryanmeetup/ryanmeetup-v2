"use client";

import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  Avatar,
  AnimatedCollapse,
  ConfirmationDialog,
  FormattedText,
  IconButton,
  toast,
} from "@ryanmeetup/ui";
import {
  FiChevronDown,
  FiFolder,
  FiLoader,
  FiSidebar,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import { useQueryParamState, useSearchFilter } from "@ryanmeetup/hooks";
import type { Category, Priority, Task, WorkspaceData } from "@/lib/types";
import { TaskBanners } from "@/components/global";
import {
  TaskHeaderActions,
  TaskHeaderBrand,
  TaskSearch,
  TasksSidebar,
} from "@/components/navigation";
import { TaskEditor } from "./TaskEditor";
import {
  emptyNewTaskDetails,
  type NewTaskDetailsDraft,
} from "./NewTaskDetails";
import { persistNewTaskDetails } from "@/lib/new-task-details";
import { TaskKeyBadge } from "./TaskKeyBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { TaskFilters } from "./TaskFilters";
import { TaskListView } from "./TaskListView";
import { localDateValue, TaskDueDate } from "./TaskDueDate";
import { TaskWorkspaceHeader } from "./TaskWorkspaceHeader";
import { CategoriesModal } from "@/components/categories";
import { ProjectsModal } from "@/components/projects";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { usePagination } from "@/hooks/usePagination";
import {
  createTaskMutationService,
  type TaskDraft,
} from "@/lib/task-mutations";
import { taskKey } from "@/lib/task-key";
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
const priorities: Priority[] = ["low", "medium", "high", "urgent"];
const dragScrollEdgeSize = 96;
const dragScrollMaxSpeed = 18;
function blankDraft(statusId: string, reportedBy: string): Draft {
  return {
    title: "",
    description: "",
    status_id: statusId,
    project_id: null,
    assignee_id: null,
    reported_by: reportedBy,
    start_date: null,
    due_date: null,
    due_time: null,
    reminder_at: null,
    priority: "medium",
    category_ids: [],
  };
}

function editDraft(task: Task, categoryIds: string[]): Draft {
  return {
    title: task.title,
    description: task.description,
    status_id: task.status_id,
    project_id: task.project_id,
    category_ids: categoryIds,
    assignee_id: task.assignee_id,
    reported_by: task.reported_by,
    start_date: null,
    due_date: task.due_date,
    due_time: null,
    reminder_at: task.reminder_at,
    priority: task.priority,
  };
}

function profileName(profile: { full_name: string }) {
  return profile.full_name || "Teammate";
}

function mutationErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

function dragScrollSpeed(position: number, start: number, end: number) {
  const distanceFromStart = position - start;
  const distanceFromEnd = end - position;
  const edgeIntensity = (distance: number) =>
    Math.min(1, Math.max(0, 1 - distance / dragScrollEdgeSize));

  if (distanceFromStart < dragScrollEdgeSize) {
    return -dragScrollMaxSpeed * edgeIntensity(distanceFromStart);
  }
  if (distanceFromEnd < dragScrollEdgeSize) {
    return dragScrollMaxSpeed * edgeIntensity(distanceFromEnd);
  }
  return 0;
}

function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/70 dark:text-white/75"
      style={{
        borderColor: `${category.color}66`,
        backgroundColor: `${category.color}22`,
      }}
    >
      {category.name}
    </span>
  );
}

function BoardColumnTasks({
  statusId,
  statusName,
  tasks,
  renderTask,
  onCreate,
}: {
  statusId: string;
  statusName: string;
  tasks: Task[];
  renderTask: (task: Task) => ReactNode;
  onCreate: () => void;
}) {
  const {
    query,
    setQuery,
    filtered: filteredTasks,
    isPending,
  } = useSearchFilter({
    data: tasks,
    buildHaystack: (task) =>
      `${taskKey(task)} ${task.title} ${task.description ?? ""}`.toLowerCase(),
    queryParam: `column-${statusId}`,
  });

  return (
    <div className="space-y-3 p-1" aria-busy={isPending}>
      <div className="relative">
        <FiSearch
          aria-hidden
          className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
        />
        <input
          type="search"
          aria-label={`Search ${statusName} tasks`}
          aria-busy={isPending}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${statusName}...`}
          className="h-9 w-full rounded-lg border border-black/10 bg-white pl-9 pr-9 text-sm outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-white/5 dark:focus:border-white/30"
        />
        {isPending && (
          <FiLoader
            aria-label={`Filtering ${statusName} tasks`}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-black/45 motion-reduce:animate-none dark:text-white/45"
          />
        )}
      </div>
      <div
        className={`space-y-3 transition-opacity ${isPending ? "pointer-events-none opacity-55" : ""}`}
      >
        {filteredTasks.map(renderTask)}
        {filteredTasks.length === 0 && query.trim() && (
          <div className="rounded-xl border border-dashed border-black/15 px-3 py-8 text-center text-xs text-black/50 dark:border-white/15 dark:text-white/50">
            No {statusName} tasks match this search.
          </div>
        )}
        {filteredTasks.length === 0 && !query.trim() && (
          <button
            onClick={onCreate}
            className="w-full rounded-xl border border-dashed border-black/15 px-3 py-8 text-xs text-black/40 hover:border-black/30 hover:text-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/15 dark:text-white/40 dark:hover:border-white/30 dark:hover:text-white/60 dark:focus-visible:ring-white/30"
          >
            Drop a task here or add one
          </button>
        )}
      </div>
    </div>
  );
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
  const [draftId, setDraftId] = useState<string | null>(null);
  const draftTouched = useRef(false);
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
      : blankDraft(
          initialData.statuses[1]?.id ?? initialData.statuses[0]?.id ?? "",
          initialData.currentProfile.id,
        ),
  );

  useEffect(() => {
    if (
      !taskOpen ||
      editing ||
      !draftTouched.current ||
      !hasDraftAutosaveContent(draft)
    )
      return;
    const timer = window.setTimeout(() => {
      const saved = saveTaskDraft(
        data.currentProfile.id,
        draft,
        draftId ?? undefined,
      );
      setDraftId(saved.id);
      toast.success(draftSavedStatus("auto"), {
        id: `task-draft-autosave-${data.currentProfile.id}`,
        duration: 2500,
      });
    }, taskDraftAutosaveDelayMs);
    return () => window.clearTimeout(timer);
  }, [data.currentProfile.id, draft, draftId, editing, taskOpen]);

  useEffect(() => {
    if (!draggedTaskId) return;

    let pointer = { x: 0, y: 0 };
    let animationFrame = 0;

    const rememberPointer = (event: DragEvent) => {
      if (event.clientX === 0 && event.clientY === 0) return;
      pointer = { x: event.clientX, y: event.clientY };
    };
    const scrollAtEdges = () => {
      const verticalSpeed = dragScrollSpeed(pointer.y, 0, window.innerHeight);
      if (verticalSpeed !== 0) window.scrollBy(0, verticalSpeed);

      const board = boardScrollRef.current;
      if (board) {
        const bounds = board.getBoundingClientRect();
        const visibleLeft = Math.max(0, bounds.left);
        const visibleRight = Math.min(window.innerWidth, bounds.right);
        if (
          pointer.y >= bounds.top &&
          pointer.y <= bounds.bottom &&
          pointer.x >= visibleLeft &&
          pointer.x <= visibleRight
        ) {
          board.scrollLeft += dragScrollSpeed(
            pointer.x,
            visibleLeft,
            visibleRight,
          );
        }
      }

      animationFrame = window.requestAnimationFrame(scrollAtEdges);
    };

    window.addEventListener("dragover", rememberPointer);
    animationFrame = window.requestAnimationFrame(scrollAtEdges);
    return () => {
      window.removeEventListener("dragover", rememberPointer);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [draggedTaskId]);
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
  const [collapsedStatusIds, setCollapsedStatusIds] =
    useState<Set<string> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ryanmeetup.tasks.collapsed-statuses");
    queueMicrotask(() => {
      try {
        setCollapsedStatusIds(
          new Set(saved ? (JSON.parse(saved) as string[]) : []),
        );
      } catch {
        localStorage.removeItem("ryanmeetup.tasks.collapsed-statuses");
        setCollapsedStatusIds(new Set());
      }
    });
  }, []);

  useEffect(() => {
    if (!collapsedStatusIds) return;
    localStorage.setItem(
      "ryanmeetup.tasks.collapsed-statuses",
      JSON.stringify([...collapsedStatusIds]),
    );
  }, [collapsedStatusIds]);

  function toggleStatusSection(statusId: string) {
    setCollapsedStatusIds((current) => {
      const next = new Set(current ?? []);
      if (next.has(statusId)) next.delete(statusId);
      else next.add(statusId);
      return next;
    });
  }

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
  const splitValues = (value: string) =>
    value === "all" || !value ? [] : value.split(",").filter(Boolean);
  const profileIds = (value: string, allowUnassigned = false) =>
    splitValues(value).flatMap((entry) => {
      if (allowUnassigned && entry.toLowerCase() === "unassigned")
        return ["unassigned"];
      const profile =
        profiles.get(entry) ??
        data.profiles.find((item) => profileName(item) === entry);
      return profile ? [profile.id] : [];
    });
  const includedAssigneeIds = profileIds(assignee, true);
  const excludedAssigneeIds = profileIds(excludedAssignees, true);
  const includedReporterIds = profileIds(reporter);
  const excludedReporterIds = profileIds(excludedReporters);
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
  const entityIds = <T extends { id: string; name: string }>(
    value: string,
    items: T[],
    allowNone = false,
  ) =>
    splitValues(value).flatMap((entry) => {
      if (allowNone && entry === "none") return ["none"];
      const item = items.find(
        (candidate) => candidate.id === entry || candidate.name === entry,
      );
      return item ? [item.id] : [];
    });
  const includedProjectIds = entityIds(project, data.projects, true);
  const excludedProjectIds = entityIds(excludedProjects, data.projects, true);
  const includedStatusIds = entityIds(status, data.statuses);
  const excludedStatusIds = entityIds(excludedStatuses, data.statuses);
  const includedPriorityValues = splitValues(priority)
    .map((value) => value.toLowerCase())
    .filter((value): value is Priority =>
      priorities.includes(value as Priority),
    );
  const excludedPriorityValues = splitValues(excludedPriorities)
    .map((value) => value.toLowerCase())
    .filter((value): value is Priority =>
      priorities.includes(value as Priority),
    );
  const includedDueValues = splitValues(dueWithin).filter((value) =>
    ["7", "14", "30"].includes(value),
  );
  const excludedDueValues = splitValues(excludedDueWithin).filter((value) =>
    ["7", "14", "30"].includes(value),
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
  async function loadTaskPage(replace = false) {
    if (demoMode || taskPageLoading) return;
    setTaskPageLoading(true);
    try {
      const params = new URLSearchParams({ visibility });
      if (data.accessPreview) {
        params.set(
          data.accessPreview.kind === "group" ? "viewAsGroup" : "viewAsUser",
          data.accessPreview.subjectId,
        );
      }
      if (view === "list") {
        params.set("paginated", "1");
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        params.set("sort", sort);
        if (includedStatusIds.length)
          params.set("status", includedStatusIds.join(","));
        if (excludedStatusIds.length)
          params.set("excludeStatuses", excludedStatusIds.join(","));
        if (includedProjectIds.length)
          params.set("project", includedProjectIds.join(","));
        if (excludedProjectIds.length)
          params.set("excludeProjects", excludedProjectIds.join(","));
        if (includedAssigneeIds.length)
          params.set("assignee", includedAssigneeIds.join(","));
        if (excludedAssigneeIds.length)
          params.set("excludeAssignees", excludedAssigneeIds.join(","));
        if (includedReporterIds.length)
          params.set("reporter", includedReporterIds.join(","));
        if (excludedReporterIds.length)
          params.set("excludeReporters", excludedReporterIds.join(","));
        if (includedCategoryIds.length)
          params.set("categories", includedCategoryIds.join(","));
        if (excludedCategoryIds.length)
          params.set("excludeCategories", excludedCategoryIds.join(","));
        if (includedPriorityValues.length)
          params.set("priority", includedPriorityValues.join(","));
        if (excludedPriorityValues.length)
          params.set("excludePriorities", excludedPriorityValues.join(","));
        if (includedDueValues.length)
          params.set("dueWithin", includedDueValues.join(","));
        if (excludedDueValues.length)
          params.set("excludeDueWithin", excludedDueValues.join(","));
        if (committedSearch.trim())
          params.set("search", committedSearch.trim());
      }
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
      toast.error(mutationErrorMessage(error, "Tasks could not be loaded."));
    } finally {
      setTaskPageLoading(false);
    }
  }

  const taskQuerySignature =
    view === "list"
      ? [
          visibility,
          includedStatusIds.join(","),
          excludedStatusIds.join(","),
          includedProjectIds.join(","),
          excludedProjectIds.join(","),
          includedAssigneeIds.join(","),
          excludedAssigneeIds.join(","),
          includedReporterIds.join(","),
          excludedReporterIds.join(","),
          includedCategoryIds.join(","),
          excludedCategoryIds.join(","),
          includedPriorityValues.join(","),
          excludedPriorityValues.join(","),
          includedDueValues.join(","),
          excludedDueValues.join(","),
          committedSearch,
          sort,
          pageSize,
        ].join("|")
      : `board|${visibility}`;
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
      setAssignee(profileName(selectedAssignee));
    } else if (assignee === "unassigned") {
      setAssignee("Unassigned");
    }
  }, [assignee, profiles, selectedAssignee, setAssignee]);
  useEffect(() => {
    if (reporter !== "all" && profiles.has(reporter) && selectedReporter) {
      setReporter(profileName(selectedReporter));
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
  const categoriesByTask = useMemo(() => {
    const result = new Map<string, Set<string>>();
    data.taskCategories.forEach((item) => {
      const ids = result.get(item.task_id) ?? new Set<string>();
      ids.add(item.category_id);
      result.set(item.task_id, ids);
    });
    return result;
  }, [data.taskCategories]);
  const assigneesByTask = useMemo(() => {
    const result = new Map<string, Set<string>>();
    data.tasks.forEach((task) => {
      if (task.assignee_id) {
        result.set(task.id, new Set([task.assignee_id]));
      }
    });
    return result;
  }, [data.tasks]);
  const taskDueWithin = useCallback(
    (task: Task, days: string) =>
      Boolean(task.due_date) &&
      task.due_date! >= localDateValue(new Date(clock)) &&
      task.due_date! <=
        localDateValue(
          new Date(clock + Number.parseInt(days, 10) * 86_400_000),
        ),
    [clock],
  );
  const visibleTasks = useMemo(
    () =>
      searchedTasks
        .filter((task) => {
          return (
            (includedAssigneeIds.length === 0 ||
              includedAssigneeIds.some((id) =>
                id === "unassigned"
                  ? !task.assignee_id
                  : task.assignee_id === id,
              )) &&
            !excludedAssigneeIds.some((id) =>
              id === "unassigned" ? !task.assignee_id : task.assignee_id === id,
            ) &&
            (includedReporterIds.length === 0 ||
              includedReporterIds.includes(task.reported_by ?? "")) &&
            !excludedReporterIds.includes(task.reported_by ?? "") &&
            (includedCategoryIds.length === 0 ||
              includedCategoryIds.some((id) =>
                categoriesByTask.get(task.id)?.has(id),
              )) &&
            !excludedCategoryIds.some((id) =>
              categoriesByTask.get(task.id)?.has(id),
            ) &&
            (includedProjectIds.length === 0 ||
              includedProjectIds.some((id) =>
                id === "none"
                  ? task.project_id === null
                  : task.project_id === id,
              )) &&
            !excludedProjectIds.some((id) =>
              id === "none" ? task.project_id === null : task.project_id === id,
            ) &&
            (includedStatusIds.length === 0 ||
              includedStatusIds.includes(task.status_id)) &&
            !excludedStatusIds.includes(task.status_id) &&
            (includedPriorityValues.length === 0 ||
              includedPriorityValues.includes(task.priority)) &&
            !excludedPriorityValues.includes(task.priority) &&
            (includedDueValues.length === 0 ||
              includedDueValues.some((days) => taskDueWithin(task, days))) &&
            !excludedDueValues.some((days) => taskDueWithin(task, days)) &&
            (visibility === "archived"
              ? Boolean(
                  task.archived_at &&
                  new Date(task.archived_at).getTime() <= clock,
                )
              : !task.archived_at ||
                new Date(task.archived_at).getTime() > clock)
          );
        })
        .sort((a, b) =>
          view === "board"
            ? a.board_position - b.board_position
            : sort === "due"
              ? (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999")
              : sort === "priority"
                ? priorities.indexOf(b.priority) -
                  priorities.indexOf(a.priority)
                : b.updated_at.localeCompare(a.updated_at),
        ),
    [
      categoriesByTask,
      includedCategoryIds,
      excludedCategoryIds,
      includedAssigneeIds,
      excludedAssigneeIds,
      includedReporterIds,
      excludedReporterIds,
      includedProjectIds,
      excludedProjectIds,
      includedStatusIds,
      excludedStatusIds,
      includedPriorityValues,
      excludedPriorityValues,
      includedDueValues,
      excludedDueValues,
      searchedTasks,
      sort,
      visibility,
      view,
      clock,
      taskDueWithin,
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
    setDraftId(null);
    setNewTaskDetails(emptyNewTaskDetails());
    draftTouched.current = false;
    const scopedDraft = blankDraft(
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
    setDraftId(null);
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
      draftId ?? undefined,
    );
    setDraftId(saved.id);
    toast.success(draftSavedStatus("manual"));
    setTaskOpen(false);
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
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
      if (!editing && draftId) {
        deleteTaskDraft(data.currentProfile.id, draftId);
        setDraftId(null);
      }
      if (!demoMode && view === "list") await loadTaskPage(true);
      if (!editing && createAnother) {
        draftTouched.current = false;
        setDraft({
          ...blankDraft(draft.status_id, data.currentProfile.id),
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
      const message = mutationErrorMessage(
        error,
        "The task could not be saved.",
      );
      setTaskMessage(message);
      toast.error(message);
    } finally {
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
      toast.error(
        mutationErrorMessage(error, "The task could not be deleted."),
      );
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
      toast.error(mutationErrorMessage(error, "The task could not be moved."));
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
    const completedSubtasks = taskSubtasks.filter(
      (item) => item.is_completed,
    ).length;
    return (
      <button
        draggable
        onDragStart={(event) => {
          setDraggedTaskId(task.id);
          event.dataTransfer.setData("text/task-id", task.id);
          event.dataTransfer.effectAllowed = "move";
          const source = event.currentTarget;
          const bounds = source.getBoundingClientRect();
          const previewFrame = document.createElement("div");
          const previewCard = source.cloneNode(true) as HTMLButtonElement;
          previewFrame.setAttribute("aria-hidden", "true");
          previewFrame.style.position = "fixed";
          previewFrame.style.top = "-2000px";
          previewFrame.style.left = "-2000px";
          previewFrame.style.width = `${bounds.width + 32}px`;
          previewFrame.style.height = `${bounds.height + 32}px`;
          previewFrame.style.pointerEvents = "none";
          previewCard.style.position = "absolute";
          previewCard.style.top = "16px";
          previewCard.style.left = "16px";
          previewCard.style.width = `${bounds.width}px`;
          previewCard.style.transform = "translate(8px, -5px) rotate(2.5deg)";
          previewCard.style.transformOrigin = "center";
          previewCard.style.boxShadow = "0 18px 40px rgb(0 0 0 / 0.2)";
          previewCard.style.opacity = "0.92";
          previewFrame.append(previewCard);
          document.body.append(previewFrame);
          event.dataTransfer.setDragImage(
            previewFrame,
            event.clientX - bounds.left + 16,
            event.clientY - bounds.top + 16,
          );
          window.setTimeout(() => previewFrame.remove(), 0);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (draggedTaskId === task.id) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          setDragOverStatusId(task.status_id);
          setDragTarget({
            taskId: task.id,
            edge:
              event.clientY < bounds.top + bounds.height / 2
                ? "before"
                : "after",
          });
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const id = event.dataTransfer.getData("text/task-id");
          const bounds = event.currentTarget.getBoundingClientRect();
          const edge =
            event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
          setDragOverStatusId(null);
          setDragTarget(null);
          setDraggedTaskId(null);
          void moveTask(id, task.status_id, task.id, edge);
        }}
        onDragEnd={() => {
          setDragOverStatusId(null);
          setDragTarget(null);
          setDraggedTaskId(null);
        }}
        onClick={() => openEdit(task)}
        key={task.id}
        className={`group w-full cursor-grab rounded-xl border border-black/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20 active:cursor-grabbing dark:border-white/10 dark:bg-zinc-900 dark:hover:border-white/30 dark:focus-visible:ring-white/30 ${
          dragTarget?.taskId === task.id
            ? dragTarget.edge === "before"
              ? "relative before:absolute before:-top-2 before:right-2 before:left-2 before:h-1 before:rounded-full before:bg-blue-500 before:content-[''] dark:before:bg-blue-400"
              : "relative after:absolute after:-right-2 after:-bottom-2 after:left-2 after:h-1 after:rounded-full after:bg-blue-500 after:content-[''] dark:after:bg-blue-400"
            : ""
        }`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <span className="flex flex-wrap items-center gap-1.5">
            <TaskKeyBadge task={task} />
            <TaskPriorityBadge priority={task.priority} size="compact" />
          </span>
          <FiMoreHorizontal className="shrink-0 text-black/30 transition group-hover:text-black/70 dark:text-white/30 dark:group-hover:text-white/70" />
        </div>
        <h3 className="font-semibold leading-snug text-black dark:text-white">
          {task.title}
        </h3>
        {task.description && (
          <FormattedText
            text={task.description}
            className="mt-2 line-clamp-2 text-xs leading-relaxed text-black/60 dark:text-white/60"
          />
        )}
        {taskSubtasks.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="ml-auto text-[10px] font-semibold text-black/50 dark:text-white/50">
              ✓ {completedSubtasks}/{taskSubtasks.length}
            </span>
          </div>
        )}
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            {taskCategories.length > 0 && (
              <span className="flex flex-wrap gap-1.5">
                {taskCategories.map((category) => (
                  <CategoryBadge key={category.id} category={category} />
                ))}
              </span>
            )}
            {taskProject && (
              <span className="flex items-center gap-1.5 truncate text-[10px] font-semibold text-black/60 dark:text-white/60">
                <FiFolder className="shrink-0" />
                {taskProject.name}
              </span>
            )}
            {task.due_date && (
              <TaskDueDate
                dueDate={task.due_date}
                isCompleted={taskStatus?.is_completed ?? false}
                showIcon
              />
            )}
          </div>
          {taskPeople.length > 0 ? (
            <span className="flex shrink-0 -space-x-1.5">
              {taskPeople.slice(0, 3).map((person) => (
                <Avatar
                  key={person.id}
                  name={profileName(person)}
                  size="sm"
                  src={person.avatar_url}
                />
              ))}
            </span>
          ) : (
            <span
              title="Unassigned"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-dashed border-black/30 text-black/40 dark:border-white/30 dark:text-white/40"
            >
              <FiUsers size={12} />
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-black dark:bg-[#101010] dark:text-white">
      <TasksSidebar
        data={data}
        demoMode={demoMode}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onCreateCategory={() => {
          setCategoryEditId(null);
          setCategoriesOpen(true);
        }}
        onCreateProject={() => {
          setProjectEditId(null);
          setProjectsOpen(true);
        }}
      />

      <main className="min-w-0 lg:pl-64">
        <header className="tasks-app-header">
          <IconButton
            label="Open navigation"
            tooltipTriggerClassName="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <FiSidebar />
          </IconButton>
          <TaskHeaderBrand />
          <TaskSearch
            tasks={data.tasks}
            projects={data.projects}
            categories={data.categories}
            statuses={data.statuses}
            profiles={data.profiles}
          />
          <TaskHeaderActions
            data={data}
            setData={setData}
            demoMode={demoMode}
            onNewTask={() => openCreate()}
          />
        </header>
        <TaskBanners preview={data.accessPreview} />
        {demoMode && (
          <div className="border-b border-amber-300/40 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Local demo mode · Add Supabase environment variables to enable team
            auth and realtime sync.
          </div>
        )}
        <div className="p-4 sm:p-6 lg:p-8">
          <TaskWorkspaceHeader
            assignee={assignee}
            isMyTasks={isMyTasks}
            myTasksName={myTasksName}
            onEditProject={() => {
              if (!selectedProject) return;
              setProjectEditId(selectedProject.id);
              setProjectsOpen(true);
            }}
            onEditCategory={() => {
              if (!selectedCategory) return;
              setCategoryEditId(selectedCategory.id);
              setCategoriesOpen(true);
            }}
            onSetAssignee={setAssignee}
            onSetView={setView}
            previewing={Boolean(data.accessPreview)}
            scopeDescription={scopeDescription}
            selectedCategory={selectedCategory}
            selectedProject={selectedProject}
            projectOwners={selectedProjectOwners}
            taskCount={visibleTaskCount}
            view={view}
            viewTitle={viewTitle}
            viewingAsGroup={viewingAsGroup}
          />
          <TaskFilters
            categories={data.categories}
            clearFilters={clearTaskFilters}
            currentProfileId={data.currentProfile.id}
            filterCount={filterCount}
            includedCategoryIds={includedCategoryIds}
            excludedCategoryIds={excludedCategoryIds}
            filterSelections={{
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
            }}
            onIncludedCategoriesChange={(ids) => {
              setGroup("all");
              setIncludedCategories(categoryNames(ids));
              setExcludedCategories(
                categoryNames(
                  excludedCategoryIds.filter((id) => !ids.includes(id)),
                ),
              );
            }}
            onExcludedCategoriesChange={(ids) => {
              setExcludedCategories(categoryNames(ids));
              setIncludedCategories(
                categoryNames(
                  includedCategoryIds.filter((id) => !ids.includes(id)),
                ),
              );
              if (selectedCategory && ids.includes(selectedCategory.id))
                setGroup("all");
            }}
            onFilterSelectionChange={(filter, kind, values) => {
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
                project: kind === "included" ? setProject : setExcludedProjects,
                status: kind === "included" ? setStatus : setExcludedStatuses,
                priority:
                  kind === "included" ? setPriority : setExcludedPriorities,
                dueWithin:
                  kind === "included" ? setDueWithin : setExcludedDueWithin,
              };
              setters[filter as keyof typeof setters]?.(value);
            }}
            onVisibilityChange={setVisibility}
            profiles={data.profiles}
            projects={data.projects}
            statuses={statuses}
            visibility={visibility}
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
                            label={`Add task to ${item.name}`}
                            tooltipTriggerClassName="ml-auto"
                            onClick={() => openCreate(item.id)}
                          >
                            <FiPlus />
                          </IconButton>
                          <IconButton
                            label={`${isCollapsed ? "Expand" : "Collapse"} ${item.name}`}
                            aria-expanded={!isCollapsed}
                            aria-controls={`status-column-${item.id}`}
                            onClick={() => toggleStatusSection(item.id)}
                          >
                            <FiChevronDown
                              className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                            />
                          </IconButton>
                        </div>
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
                  assigneesByTask={assigneesByTask}
                  categories={categories}
                  categoriesByTask={categoriesByTask}
                  loading={taskPageLoading}
                  onOpenTask={openEdit}
                  onPageChange={(nextPage) => {
                    setView("list");
                    setPage(nextPage);
                  }}
                  onPageSizeChange={(nextPageSize) => {
                    setView("list");
                    setPageSize(nextPageSize);
                  }}
                  onSortChange={(nextSort) => {
                    setView("list");
                    setSort(nextSort);
                  }}
                  onToggleSort={() =>
                    setSort(sort === "due" ? "updated" : "due")
                  }
                  page={data.taskPage?.page ?? page}
                  pageSize={data.taskPage?.pageSize ?? pageSize}
                  profiles={profiles}
                  projects={projects}
                  sort={sort}
                  statuses={statuses}
                  tasks={listTasks}
                  totalCount={data.taskPage?.totalCount ?? visibleTasks.length}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <TaskEditor
        taskOpen={taskOpen}
        setTaskOpen={setTaskOpen}
        editing={editing}
        taskDetailsOpen={taskDetailsOpen}
        setTaskDetailsOpen={setTaskDetailsOpen}
        createAnother={createAnother}
        setCreateAnother={setCreateAnother}
        taskSaving={taskSaving}
        draft={draft}
        setDraft={updateDraft}
        statuses={statuses}
        data={data}
        setData={setData}
        demoMode={demoMode}
        saveTask={saveTask}
        saveDraft={saveAsDraft}
        setTaskPendingDelete={setTaskPendingDelete}
        taskMessage={taskMessage}
        newTaskDetails={newTaskDetails}
        setNewTaskDetails={setNewTaskDetails}
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
          open={categoriesOpen}
          setOpen={(nextOpen) => {
            setCategoriesOpen(nextOpen);
            if (!nextOpen) setCategoryEditId(null);
          }}
          data={data}
          setData={setData}
          demoMode={demoMode}
          editCategoryId={categoryEditId}
          createOnly
          onCategoryUpdated={(updatedCategory) => {
            if (selectedCategory?.id === updatedCategory.id) {
              setGroup(updatedCategory.name);
              setIncludedCategories(updatedCategory.name);
            }
          }}
        />
      )}
      {projectsOpen && (
        <ProjectsModal
          open={projectsOpen}
          setOpen={(nextOpen) => {
            setProjectsOpen(nextOpen);
            if (!nextOpen) setProjectEditId(null);
          }}
          data={data}
          setData={setData}
          demoMode={demoMode}
          editProjectId={projectEditId}
          createOnly
          onProjectUpdated={(updatedProject) => {
            if (selectedProject?.id === updatedProject.id) {
              setProject(updatedProject.name);
            }
          }}
        />
      )}
    </div>
  );
}
