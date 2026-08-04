"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Avatar,
  AnimatedCollapse,
  Button,
  Card,
  ConfirmationDialog,
  DropdownSelect,
  EmptyState,
  FormattedText,
  Heading,
  IconButton,
  Pill,
  Tooltip,
  toast,
} from "@ryanmeetup/ui";
import {
  FiCalendar,
  FiChevronDown,
  FiFilter,
  FiFolder,
  FiGrid,
  FiList,
  FiLoader,
  FiMenu,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiUsers,
  FiX,
} from "react-icons/fi";
import Link from "next/link";
import { useQueryParamState, useSearchFilter } from "@ryanmeetup/hooks";
import type { Category, Priority, Task, WorkspaceData } from "@/lib/types";
import { TaskBanners } from "@/components/global";
import { TaskHeaderActions } from "@/components/navigation";
import { TaskEditor } from "./TaskEditor";
import { CategoriesModal } from "@/components/categories";
import { ProjectLinks, ProjectsModal } from "@/components/projects";
import { useSidebarSections } from "@/hooks/useSidebarSections";
import { withAccessPreview } from "@/lib/access-preview";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import {
  createTaskMutationService,
  type TaskDraft,
} from "@/lib/task-mutations";

export { StatusSettingsModal } from "./TaskAdministration";

type View = "board" | "list";
type Draft = TaskDraft;
const priorities: Priority[] = ["low", "medium", "high", "urgent"];
const priorityStyles: Record<Priority, string> = {
  low: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
  medium:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
  high: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  urgent:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
};

function blankDraft(statusId: string): Draft {
  return {
    title: "",
    description: "",
    status_id: statusId,
    project_id: null,
    assignee_id: null,
    start_date: null,
    due_date: null,
    due_time: null,
    reminder_at: null,
    priority: "medium",
    category_ids: [],
  };
}

function displayDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
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

function SidebarFilterButton({
  active,
  label,
  leading,
  onClick,
}: {
  active: boolean;
  label: string;
  leading: ReactNode;
  onClick: () => void;
}) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const labelElement = labelRef.current;
    if (!labelElement) return;

    const updateTruncation = () =>
      setIsTruncated(labelElement.scrollWidth > labelElement.clientWidth);
    updateTruncation();

    const resizeObserver = new ResizeObserver(updateTruncation);
    resizeObserver.observe(labelElement);
    return () => resizeObserver.disconnect();
  }, [label]);

  const button = (
    <button
      onClick={onClick}
      className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
    >
      {leading}
      <span ref={labelRef} className="min-w-0 flex-1 truncate">
        {label}
      </span>
    </button>
  );

  return (
    <Tooltip
      content={label}
      disabled={!isTruncated}
      placement="right"
      triggerClassName="w-full"
    >
      {button}
    </Tooltip>
  );
}

export function TaskApp({
  initialData,
  demoMode,
  initialTaskOpen = false,
}: {
  initialData: WorkspaceData;
  demoMode: boolean;
  initialTaskOpen?: boolean;
}) {
  const { data, setData, getData } = useWorkspaceData(initialData, demoMode);
  const mutations = useMemo(
    () => createTaskMutationService({ demoMode, getData, setData }),
    [demoMode, getData, setData],
  );
  const [viewParam, setView] = useQueryParamState("view", "board");
  const view: View = viewParam === "list" ? "list" : "board";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    categoriesExpanded,
    setCategoriesExpanded,
    projectsExpanded,
    setProjectsExpanded,
  } = useSidebarSections();
  const [taskOpen, setTaskOpen] = useState(initialTaskOpen);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [taskMessage, setTaskMessage] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null);
  const [taskDeleting, setTaskDeleting] = useState(false);
  const [taskPageLoading, setTaskPageLoading] = useState(false);
  const loadedVisibility = useRef<"active" | "archived">("active");
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<{
    taskId: string;
    edge: "before" | "after";
  } | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [draft, setDraft] = useState<Draft>(
    blankDraft(
      initialData.statuses[1]?.id ?? initialData.statuses[0]?.id ?? "",
    ),
  );
  const {
    query: search,
    setQuery: setSearch,
    filtered: searchedTasks,
    isPending: searchPending,
  } = useSearchFilter({
    data: data.tasks,
    buildHaystack: (task) =>
      `${task.title} ${task.description ?? ""}`.toLowerCase(),
  });
  const {
    assignee,
    setAssignee,
    group,
    setGroup,
    project,
    setProject,
    status,
    setStatus,
    priority,
    setPriority,
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
  const activeProjects = useMemo(
    () => data.projects.filter((item) => !item.archived_at),
    [data.projects],
  );
  const selectedAssignee =
    assignee === "all" || assignee.toLowerCase() === "unassigned"
      ? null
      : (profiles.get(assignee) ??
        data.profiles.find((item) => profileName(item) === assignee));
  const selectedCategory =
    group === "all"
      ? null
      : (categories.get(group) ??
        data.categories.find((item) => item.name === group));
  const selectedProject =
    project === "all" || project === "none"
      ? null
      : (projects.get(project) ??
        data.projects.find((item) => item.name === project));
  const selectedStatus =
    status === "all"
      ? null
      : (data.statuses.find((item) => item.id === status) ??
        data.statuses.find((item) => item.name === status));
  const selectedPriority =
    priority === "all"
      ? null
      : priorities.find(
          (item) => item.toLowerCase() === priority.toLowerCase(),
        );
  async function loadTaskPage(page: number, replace = false) {
    if (demoMode || taskPageLoading) return;
    setTaskPageLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), visibility });
      if (selectedStatus) params.set("status", selectedStatus.id);
      if (selectedProject) params.set("project", selectedProject.id);
      else if (project === "none") params.set("project", "none");
      if (selectedAssignee) params.set("assignee", selectedAssignee.id);
      else if (assignee.toLowerCase() === "unassigned")
        params.set("assignee", "unassigned");
      if (selectedCategory) params.set("category", selectedCategory.id);
      if (selectedPriority) params.set("priority", selectedPriority);
      if (search.trim()) params.set("search", search.trim());
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
          tasks: replace
            ? result.tasks!
            : [
                ...current.tasks,
                ...result.tasks!.filter(
                  (task) => !current.tasks.some((item) => item.id === task.id),
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
          taskPage: result.page,
        };
      });
      loadedVisibility.current =
        visibility === "archived" ? "archived" : "active";
    } catch (error) {
      toast.error(mutationErrorMessage(error, "Tasks could not be loaded."));
    } finally {
      setTaskPageLoading(false);
    }
  }

  useEffect(() => {
    if (!demoMode && visibility !== loadedVisibility.current)
      void loadTaskPage(0, true);
    // Fetching is intentionally tied to the archive partition transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, visibility]);
  useEffect(() => {
    if (assignee !== "all" && profiles.has(assignee) && selectedAssignee) {
      setAssignee(profileName(selectedAssignee));
    } else if (assignee === "unassigned") {
      setAssignee("Unassigned");
    }
  }, [assignee, profiles, selectedAssignee, setAssignee]);
  useEffect(() => {
    if (group !== "all" && categories.has(group) && selectedCategory) {
      setGroup(selectedCategory.name);
    }
  }, [categories, group, selectedCategory, setGroup]);
  useEffect(() => {
    if (
      project !== "all" &&
      project !== "none" &&
      projects.has(project) &&
      selectedProject
    ) {
      setProject(selectedProject.name);
    }
  }, [project, projects, selectedProject, setProject]);
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
  const visibleTasks = useMemo(
    () =>
      searchedTasks
        .filter((task) => {
          return (
            (assignee === "all" ||
              (assignee.toLowerCase() === "unassigned"
                ? !assigneesByTask.get(task.id)?.size
                : selectedAssignee
                  ? assigneesByTask.get(task.id)?.has(selectedAssignee.id)
                  : false)) &&
            (group === "all" ||
              (selectedCategory
                ? categoriesByTask.get(task.id)?.has(selectedCategory.id)
                : false)) &&
            (project === "all" ||
              (project === "none"
                ? task.project_id === null
                : task.project_id === selectedProject?.id)) &&
            (status === "all" || task.status_id === selectedStatus?.id) &&
            (priority === "all" || task.priority === selectedPriority) &&
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
      assignee,
      assigneesByTask,
      categoriesByTask,
      group,
      priority,
      project,
      selectedCategory,
      selectedProject,
      searchedTasks,
      selectedAssignee,
      sort,
      status,
      selectedPriority,
      visibility,
      view,
      clock,
      selectedStatus,
    ],
  );

  function openCreate(statusId?: string) {
    setTaskMessage("");
    setEditing(null);
    setTaskDetailsOpen(false);
    setCreateAnother(false);
    const scopedDraft = blankDraft(
      statusId ??
        selectedStatus?.id ??
        statuses[1]?.id ??
        statuses[0]?.id ??
        "",
    );
    scopedDraft.category_ids = selectedCategory ? [selectedCategory.id] : [];
    scopedDraft.project_id = selectedProject?.id ?? null;
    scopedDraft.assignee_id = selectedAssignee?.id ?? null;
    scopedDraft.priority = selectedPriority ?? "medium";
    setDraft(scopedDraft);
    setTaskOpen(true);
  }

  function openEdit(task: Task) {
    setTaskMessage("");
    setEditing(task);
    setTaskDetailsOpen(data.currentProfile.task_details_open_by_default);
    setCreateAnother(false);
    setDraft({
      title: task.title,
      description: task.description,
      status_id: task.status_id,
      project_id: task.project_id,
      category_ids: [...(categoriesByTask.get(task.id) ?? [])],
      assignee_id: task.assignee_id,
      start_date: null,
      due_date: task.due_date,
      due_time: null,
      reminder_at: task.reminder_at,
      priority: task.priority,
    });
    setTaskOpen(true);
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      return;
    }
    setTaskMessage("");
    setTaskSaving(true);
    try {
      const saved = await mutations.save(draft, editing);
      mutations.applySaved(saved, Boolean(editing));
      if (!editing && createAnother) {
        setDraft({
          ...blankDraft(draft.status_id),
          priority: draft.priority,
          category_ids: [...draft.category_ids],
          project_id: draft.project_id,
          assignee_id: draft.assignee_id,
        });
        toast.success("Task created. Add the next one.");
        return;
      }
      setTaskOpen(false);
      toast.success(editing ? "Task updated." : "Task created.");
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
    try {
      await mutations.move(id, statusId, targetId, edge);
    } catch (error) {
      toast.error(mutationErrorMessage(error, "The task could not be moved."));
    }
  }
  const filterCount =
    [isMyTasks ? "all" : assignee, group, project, status, priority].filter(
      (value) => value !== "all",
    ).length + (visibility === "archived" ? 1 : 0);
  const taskCard = (task: Task) => {
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
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] ${priorityStyles[task.priority]}`}
          >
            {task.priority}
          </span>
          <FiMoreHorizontal className="text-black/30 transition group-hover:text-black/70 dark:text-white/30 dark:group-hover:text-white/70" />
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
          <div className="min-w-0 space-y-2">
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
              <span className="flex items-center gap-1.5 text-[11px] text-black/55 dark:text-white/55">
                <FiCalendar />
                {displayDate(task.due_date)}
              </span>
            )}
          </div>
          {taskPeople.length > 0 ? (
            <span className="flex -space-x-1.5">
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
              className="grid h-6 w-6 place-items-center rounded-full border border-dashed border-black/30 text-black/40 dark:border-white/30 dark:text-white/40"
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
      {sidebarOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-black/10 bg-white p-4 transition-transform dark:border-white/10 dark:bg-black lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-12 items-center justify-between px-2">
          <Link
            href={withAccessPreview("/", data.accessPreview)}
            aria-label="Task tracker home"
            className="-ml-2 rounded-lg px-2 py-1 transition duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 motion-reduce:transform-none dark:hover:bg-white/10 dark:focus-visible:ring-white/40"
          >
            <p className="font-cooper text-2xl uppercase">Ryan Meetup</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
              Task tracker
            </p>
          </Link>
          <IconButton
            label="Close navigation"
            tooltipTriggerClassName="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <FiX />
          </IconButton>
        </div>
        <nav className="mt-8 space-y-1" aria-label="Main navigation">
          <Link
            href={withAccessPreview("/", data.accessPreview)}
            onClick={() => {
              clearTaskFilters();
              setSidebarOpen(false);
            }}
            className={`sidebar-link ${!scopeName && assignee === "all" && status === "all" && priority === "all" && visibility === "active" ? "sidebar-link-active" : ""}`}
          >
            <FiGrid />
            All Tasks
          </Link>
          <Tooltip
            content="Calendar view is coming soon"
            placement="right"
            triggerClassName="w-full"
          >
            <button disabled className="sidebar-link opacity-40">
              <FiCalendar />
              Calendar
              <Pill size="sm" className="ml-auto">
                Soon
              </Pill>
            </button>
          </Tooltip>
        </nav>
        <div className="mt-8 flex min-h-0 flex-1 flex-col">
          <section
            className={`flex max-h-[70%] min-h-0 shrink-0 flex-col overflow-hidden ${categoriesExpanded ? "border-b border-black/10 dark:border-white/10" : ""}`}
          >
            <div className="flex items-center justify-between px-3">
              <button
                type="button"
                aria-expanded={categoriesExpanded}
                onClick={() => setCategoriesExpanded((current) => !current)}
                className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:text-white/45 dark:hover:text-white dark:focus-visible:ring-white/40"
              >
                <FiChevronDown
                  className={`transition-transform duration-200 motion-reduce:transition-none ${categoriesExpanded ? "" : "-rotate-90"}`}
                />
                Categories
              </button>
              <span className="flex items-center gap-1">
                <Link
                  href={withAccessPreview("/categories", data.accessPreview)}
                  className="text-[10px] font-semibold text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                >
                  Manage
                </Link>
                {!data.accessPreview && (
                  <IconButton
                    label="Create category"
                    size="sm"
                    onClick={() => setCategoriesOpen(true)}
                  >
                    <FiPlus />
                  </IconButton>
                )}
              </span>
            </div>
            <AnimatedCollapse
              open={categoriesExpanded}
              className={categoriesExpanded ? "mt-2 min-h-0 flex-1" : ""}
              contentClassName="h-full scroll-pb-2 space-y-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]"
            >
              {data.categories.length === 0 && (
                <p className="px-3 py-2 text-xs text-black/50 dark:text-white/50">
                  No categories yet.
                </p>
              )}
              {data.categories.map((item) => (
                <SidebarFilterButton
                  key={item.id}
                  active={selectedCategory?.id === item.id}
                  label={item.name}
                  onClick={() =>
                    setGroup(
                      selectedCategory?.id === item.id ? "all" : item.name,
                    )
                  }
                  leading={
                    <i
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  }
                />
              ))}
            </AnimatedCollapse>
          </section>
          <section
            className={`flex min-h-0 flex-col overflow-hidden pt-4 ${projectsExpanded ? "flex-1" : "shrink-0"}`}
          >
            <div className="flex items-center justify-between px-3">
              <button
                type="button"
                aria-expanded={projectsExpanded}
                onClick={() => setProjectsExpanded((current) => !current)}
                className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:text-white/45 dark:hover:text-white dark:focus-visible:ring-white/40"
              >
                <FiChevronDown
                  className={`transition-transform duration-200 motion-reduce:transition-none ${projectsExpanded ? "" : "-rotate-90"}`}
                />
                Projects
              </button>
              <span className="flex items-center gap-1">
                <Link
                  href={withAccessPreview("/projects", data.accessPreview)}
                  className="text-[10px] font-semibold text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                >
                  Manage
                </Link>
                {!data.accessPreview && (
                  <IconButton
                    label="Create project"
                    size="sm"
                    onClick={() => setProjectsOpen(true)}
                  >
                    <FiPlus />
                  </IconButton>
                )}
              </span>
            </div>
            <AnimatedCollapse
              open={projectsExpanded}
              className={projectsExpanded ? "mt-2 min-h-0 flex-1" : ""}
              contentClassName="h-full scroll-pb-2 space-y-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]"
            >
              {activeProjects.length === 0 && (
                <p className="px-3 py-2 text-xs text-black/50 dark:text-white/50">
                  No projects yet.
                </p>
              )}
              {activeProjects.map((item) => (
                <SidebarFilterButton
                  key={item.id}
                  active={selectedProject?.id === item.id}
                  label={item.name}
                  onClick={() =>
                    setProject(
                      selectedProject?.id === item.id ? "all" : item.name,
                    )
                  }
                  leading={<FiFolder />}
                />
              ))}
            </AnimatedCollapse>
          </section>
        </div>
      </aside>

      <main className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-black/10 bg-[#f7f7f5]/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#101010]/90 sm:px-6 lg:px-8">
          <IconButton
            label="Open navigation"
            tooltipTriggerClassName="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu />
          </IconButton>
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
            <input
              aria-label="Search tasks"
              aria-busy={searchPending}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks..."
              className="h-10 w-full rounded-lg border border-black/10 bg-white pl-10 pr-10 text-sm outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-white/5 dark:focus:border-white/30"
            />
            {searchPending && (
              <span
                role="status"
                aria-label="Loading search results"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-black/45 dark:text-white/45"
              >
                <FiLoader className="animate-spin motion-reduce:animate-none" />
              </span>
            )}
          </div>
          <TaskHeaderActions
            data={data}
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
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-black/50 dark:text-white/50">
                {selectedProject
                  ? "Project workspace"
                  : selectedCategory
                    ? "Category workspace"
                    : isMyTasks
                      ? "Personal workspace"
                      : "Team workspace"}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Heading size="h1" className="text-3xl sm:text-4xl">
                  {viewTitle}
                </Heading>
                <Pill size="sm">
                  {visibleTasks.length}{" "}
                  {visibleTasks.length === 1 ? "task" : "tasks"}
                </Pill>
              </div>
              {scopeDescription && (
                <p className="mt-2 text-sm text-black/70 dark:text-white/70 sm:text-base">
                  {scopeDescription}
                </p>
              )}
              {selectedProject && (selectedProject.links ?? []).length > 0 && (
                <ProjectLinks links={selectedProject.links} className="mt-3" />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div
                role="group"
                className="flex rounded-lg border border-black/10 bg-white p-1 dark:border-white/10 dark:bg-white/5"
                aria-label="Task scope"
              >
                <button
                  aria-pressed={assignee === "all"}
                  onClick={() => setAssignee("all")}
                  className={`view-button ${assignee === "all" ? "view-button-active" : ""}`}
                >
                  All
                </button>
                {viewingAsGroup ? (
                  <Tooltip content="Mine is unavailable when viewing as an access group because a group is not a task assignee.">
                    <button
                      type="button"
                      disabled
                      className="view-button opacity-40"
                    >
                      Mine
                    </button>
                  </Tooltip>
                ) : (
                  <button
                    aria-pressed={isMyTasks}
                    onClick={() => setAssignee(myTasksName)}
                    className={`view-button ${isMyTasks ? "view-button-active" : ""}`}
                  >
                    Mine
                  </button>
                )}
              </div>
              <div
                role="group"
                className="flex rounded-lg border border-black/10 bg-white p-1 dark:border-white/10 dark:bg-white/5"
                aria-label="Task layout"
              >
                <button
                  aria-pressed={view === "board"}
                  onClick={() => setView("board")}
                  className={`view-button ${view === "board" ? "view-button-active" : ""}`}
                >
                  <FiGrid />
                  Board
                </button>
                <button
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                  className={`view-button ${view === "list" ? "view-button-active" : ""}`}
                >
                  <FiList />
                  List
                </button>
              </div>
            </div>
          </div>
          <Card size="sm" className="mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="flex shrink-0 items-center gap-2 pr-2 text-xs font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
                <FiFilter />
                Filters
                {filterCount > 0 && (
                  <b className="grid h-5 w-5 place-items-center rounded-full bg-black text-[10px] text-white dark:bg-white dark:text-black">
                    {filterCount}
                  </b>
                )}
              </span>
              <DropdownSelect
                label="Visibility"
                value={
                  visibility === "archived" ? "Archived tasks" : "Active tasks"
                }
                onChange={setVisibility}
                options={[
                  { label: "Active tasks", value: "active" },
                  { label: "Archived tasks", value: "archived" },
                ]}
              />
              <DropdownSelect
                label="Assignee"
                value={
                  selectedAssignee
                    ? profileName(selectedAssignee)
                    : assignee.toLowerCase() === "unassigned"
                      ? "Unassigned"
                      : assignee
                }
                onChange={setAssignee}
                options={[
                  { label: "Anyone", value: "all" },
                  { label: "Unassigned", value: "Unassigned" },
                  ...data.profiles.map((item) => ({
                    avatar: {
                      name: profileName(item),
                      src: item.avatar_url,
                    },
                    label: profileName(item),
                    value: profileName(item),
                  })),
                ]}
              />
              <DropdownSelect
                label="Category"
                value={selectedCategory?.name ?? group}
                onChange={setGroup}
                options={[
                  { label: "All categories", value: "all" },
                  ...data.categories.map((item) => ({
                    label: item.name,
                    value: item.name,
                    color: item.color,
                  })),
                ]}
              />
              <DropdownSelect
                label="Project"
                value={selectedProject?.name ?? project}
                onChange={setProject}
                options={[
                  { label: "All projects", value: "all" },
                  { label: "No project", value: "none" },
                  ...data.projects.map((item) => ({
                    label: `${item.name}${item.archived_at ? " (archived)" : ""}`,
                    value: item.name,
                  })),
                ]}
              />
              <DropdownSelect
                label="Status"
                value={selectedStatus?.name ?? status}
                onChange={setStatus}
                options={[
                  { label: "All statuses", value: "all" },
                  ...statuses.map((item) => ({
                    label: item.name,
                    value: item.name,
                  })),
                ]}
              />
              <DropdownSelect
                label="Priority"
                value={
                  selectedPriority
                    ? selectedPriority[0].toUpperCase() +
                      selectedPriority.slice(1)
                    : priority
                }
                onChange={setPriority}
                options={[
                  { label: "All priorities", value: "all" },
                  ...priorities.map((item) => ({
                    label: item[0].toUpperCase() + item.slice(1),
                    value: item[0].toUpperCase() + item.slice(1),
                  })),
                ]}
              />
              {filterCount > 0 && (
                <button
                  className="shrink-0 text-xs font-semibold text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
                  onClick={clearTaskFilters}
                >
                  Clear
                </button>
              )}
            </div>
          </Card>

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
                <div className="flex flex-nowrap items-start gap-4 overflow-x-auto overscroll-x-contain pb-5">
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
                            className="h-2.5 w-2.5 rounded-full"
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
                          contentClassName="space-y-3 p-1"
                        >
                          {columnTasks.map(taskCard)}
                          {columnTasks.length === 0 && (
                            <button
                              onClick={() => openCreate(item.id)}
                              className="w-full rounded-xl border border-dashed border-black/15 px-3 py-8 text-xs text-black/40 hover:border-black/30 hover:text-black/60 dark:border-white/15 dark:text-white/40 dark:hover:border-white/30 dark:hover:text-white/60"
                            >
                              Drop a task here or add one
                            </button>
                          )}
                        </AnimatedCollapse>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <Card size="sm" className="overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left">
                      <thead className="border-b border-black/10 bg-black/[0.025] text-[10px] uppercase tracking-[0.16em] text-black/50 dark:border-white/10 dark:bg-white/[0.025] dark:text-white/50">
                        <tr>
                          <th className="px-4 py-3">Task</th>
                          <th>Status</th>
                          <th>Categories</th>
                          <th>Project</th>
                          <th>Assignee</th>
                          <th>Priority</th>
                          <th>
                            <button
                              className="flex items-center gap-1"
                              onClick={() =>
                                setSort(sort === "due" ? "updated" : "due")
                              }
                            >
                              Due <FiChevronDown />
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {visibleTasks.map((task) => {
                          const itemStatus = statuses.find(
                            (item) => item.id === task.status_id,
                          );
                          const taskCategories = [
                            ...(categoriesByTask.get(task.id) ?? []),
                          ]
                            .map((id) => categories.get(id))
                            .filter((item) => item !== undefined);
                          const taskProject = task.project_id
                            ? projects.get(task.project_id)
                            : null;
                          const taskPeople = [
                            ...(assigneesByTask.get(task.id) ?? []),
                          ]
                            .map((id) => profiles.get(id))
                            .filter((person) => person !== undefined);
                          return (
                            <tr
                              key={task.id}
                              onClick={() => openEdit(task)}
                              className="cursor-pointer text-sm hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                            >
                              <td className="px-4 py-4 font-semibold">
                                {task.title}
                              </td>
                              <td>
                                <span className="flex items-center gap-2">
                                  <i
                                    className="h-2 w-2 rounded-full"
                                    style={{
                                      backgroundColor: itemStatus?.color,
                                    }}
                                  />
                                  {itemStatus?.name}
                                </span>
                              </td>
                              <td>
                                {taskCategories.length > 0 ? (
                                  <span className="flex flex-wrap gap-1.5 py-2 pr-3">
                                    {taskCategories.map((category) => (
                                      <CategoryBadge
                                        key={category.id}
                                        category={category}
                                      />
                                    ))}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td>{taskProject?.name ?? "—"}</td>
                              <td>
                                {taskPeople.length > 0 ? (
                                  <span className="flex items-center gap-2">
                                    <span className="flex -space-x-1.5">
                                      {taskPeople.slice(0, 3).map((person) => (
                                        <Avatar
                                          key={person.id}
                                          name={profileName(person)}
                                          size="sm"
                                          src={person.avatar_url}
                                        />
                                      ))}
                                    </span>
                                    {taskPeople.map(profileName).join(", ")}
                                  </span>
                                ) : (
                                  "Unassigned"
                                )}
                              </td>
                              <td>
                                <span
                                  className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-widest ${priorityStyles[task.priority]}`}
                                >
                                  {task.priority}
                                </span>
                              </td>
                              <td>{displayDate(task.due_date)}</td>
                            </tr>
                          );
                        })}
                        {visibleTasks.length === 0 && (
                          <tr>
                            <td colSpan={7}>
                              <EmptyState
                                variant="plain"
                                message="No tasks found. Try clearing a filter or add the first task in this view."
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
            {!demoMode && data.taskPage?.hasMore && (
              <div className="mt-6 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  loading={taskPageLoading}
                  loadingText="Loading tasks..."
                  onClick={() =>
                    void loadTaskPage((data.taskPage?.page ?? 0) + 1)
                  }
                >
                  Load more tasks ({data.tasks.length} of {data.taskPage.total})
                </Button>
              </div>
            )}
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
        setDraft={setDraft}
        statuses={statuses}
        data={data}
        setData={setData}
        demoMode={demoMode}
        saveTask={saveTask}
        setTaskPendingDelete={setTaskPendingDelete}
        taskMessage={taskMessage}
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
          setOpen={setCategoriesOpen}
          data={data}
          setData={setData}
          demoMode={demoMode}
          createOnly
        />
      )}
      {projectsOpen && (
        <ProjectsModal
          open={projectsOpen}
          setOpen={setProjectsOpen}
          data={data}
          setData={setData}
          demoMode={demoMode}
          createOnly
        />
      )}
    </div>
  );
}
