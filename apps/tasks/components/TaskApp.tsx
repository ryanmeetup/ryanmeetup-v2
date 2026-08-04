"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  Avatar,
  AnimatedCollapse,
  Button,
  Card,
  ConfirmationDialog,
  DropdownSelect,
  EmptyState,
  ErrorCallout,
  FormattedText,
  Heading,
  IconButton,
  Input,
  Modal,
  Pill,
  PromptDialog,
  RichTextarea,
  Tooltip,
  toast,
} from "@ryanmeetup/ui";
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiEdit2,
  FiFilter,
  FiFolder,
  FiGrid,
  FiList,
  FiLoader,
  FiLogOut,
  FiMenu,
  FiMoreHorizontal,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useQueryParamState, useSearchFilter } from "@ryanmeetup/hooks";
import type {
  Category,
  Priority,
  Status,
  Task,
  WorkspaceData,
} from "@/lib/types";
import { TaskHeaderActions } from "./TaskHeaderActions";
import { TaskBanners } from "./TaskBanners";
import { TaskDetails } from "./TaskDetails";
import { WorkGroupsModal as CategoriesModal } from "./WorkGroupsModal";
import { ProjectsModal } from "./ProjectsModal";
import { ProjectLinks } from "./ProjectLinks";
import { useSidebarSections } from "@/hooks/useSidebarSections";
import { withAccessPreview } from "@/lib/access-preview";

type View = "board" | "list";
type Draft = Pick<
  Task,
  | "title"
  | "description"
  | "status_id"
  | "work_group_id"
  | "project_id"
  | "assignee_id"
  | "start_date"
  | "due_date"
  | "due_time"
  | "reminder_at"
  | "priority"
> & { category_ids: string[] };
const priorities: Priority[] = ["low", "medium", "high", "urgent"];
const workGroupColors = [
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#65a30d",
  "#059669",
  "#0891b2",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#c026d3",
  "#db2777",
  "#475569",
];
const priorityStyles: Record<Priority, string> = {
  low: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
  medium:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
  high: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  urgent:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
};

const archiveDelayMs = 14 * 24 * 60 * 60 * 1000;

function completionLifecycle(
  statusId: string,
  statuses: Status[],
  current?: Pick<Task, "completed_at" | "archived_at">,
) {
  if (!statuses.find((item) => item.id === statusId)?.is_completed) {
    return { completed_at: null, archived_at: null };
  }
  const completedAt = current?.completed_at ?? new Date().toISOString();
  return {
    completed_at: completedAt,
    archived_at:
      current?.archived_at ??
      new Date(new Date(completedAt).getTime() + archiveDelayMs).toISOString(),
  };
}

function blankDraft(statusId: string): Draft {
  return {
    title: "",
    description: "",
    status_id: statusId,
    work_group_id: null,
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

function ProfileSummary({
  name,
  role,
  demo = false,
}: {
  name: string;
  role?: "owner" | "member";
  demo?: boolean;
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold">{name}</span>
      <span className="block text-[10px] uppercase tracking-widest text-black/45 dark:text-white/45">
        {role === "owner" ? "Owner" : "Team member"}
        {demo ? " · Demo" : ""}
      </span>
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
  const [data, setData] = useState(initialData);
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
  const [workGroupsOpen, setWorkGroupsOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [taskMessage, setTaskMessage] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null);
  const [taskDeleting, setTaskDeleting] = useState(false);
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
  const [assignee, setAssignee] = useQueryParamState("assignee", "all");
  const [group, setGroup] = useQueryParamState("category", "all");
  const [project, setProject] = useQueryParamState("project", "all");
  const [status, setStatus] = useQueryParamState("status", "all");
  const [priority, setPriority] = useQueryParamState("priority", "all");
  const [visibility, setVisibility] = useQueryParamState(
    "visibility",
    "active",
  );
  const [sort, setSort] = useState("updated");
  const [clock, setClock] = useState(() => Date.now());
  const [collapsedStatusIds, setCollapsedStatusIds] =
    useState<Set<string> | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

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

  useEffect(() => {
    if (!demoMode) return;
    const saved = localStorage.getItem("ryanmeetup.tasks.workspace");
    if (saved) {
      try {
        const restored = JSON.parse(saved) as WorkspaceData;
        queueMicrotask(() =>
          setData({
            ...initialData,
            ...restored,
            subtasks: restored.subtasks ?? [],
            comments: restored.comments ?? [],
            activity: restored.activity ?? [],
            attachments: restored.attachments ?? [],
            labels: restored.labels ?? [],
            projects: restored.projects ?? [],
            categories: restored.categories ?? initialData.categories,
            taskCategories: restored.taskCategories ?? [],
            projectOwners: restored.projectOwners ?? [],
            taskAssignees: restored.taskAssignees ?? [],
            taskLabels: restored.taskLabels ?? [],
            statuses: (restored.statuses ?? initialData.statuses).map(
              (item) => ({
                ...item,
                is_completed:
                  item.is_completed ?? item.name.toLowerCase() === "done",
              }),
            ),
            tasks: restored.tasks.map((task) => ({
              ...task,
              due_time: task.due_time ?? null,
              reminder_at: task.reminder_at ?? null,
              project_id: task.project_id ?? null,
              completed_at: task.completed_at ?? null,
              archived_at: task.archived_at ?? null,
            })),
          }),
        );
      } catch {
        localStorage.removeItem("ryanmeetup.tasks.workspace");
      }
    }
  }, [demoMode, initialData]);

  useEffect(() => {
    if (demoMode)
      localStorage.setItem("ryanmeetup.tasks.workspace", JSON.stringify(data));
  }, [data, demoMode]);

  useEffect(() => {
    if (demoMode || initialData.accessPreview) return;
    const supabase = createClient();
    const channel = supabase
      .channel("tasks-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        async () => {
          const { data: tasks } = await supabase
            .from("tasks")
            .select("*")
            .order("updated_at", { ascending: false });
          if (tasks) setData((current) => ({ ...current, tasks }));
        },
      )
      .subscribe();
    const detailsChannel = supabase
      .channel("task-details-live")
      .on("postgres_changes", { event: "*", schema: "public" }, async () => {
        const [
          { data: subtasks },
          { data: comments },
          { data: activity },
          { data: attachments },
          { data: labels },
          { data: projects },
          { data: categories },
          { data: taskCategories },
          { data: profiles },
          { data: taskAssignees },
          { data: taskLabels },
        ] = await Promise.all([
          supabase.from("subtasks").select("*").order("sort_order"),
          supabase.from("task_comments").select("*").order("created_at"),
          supabase
            .from("task_activity")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase.from("task_attachments").select("*").order("created_at"),
          supabase.from("labels").select("*").order("name"),
          supabase.from("projects").select("*").order("name"),
          supabase.from("work_groups").select("*").order("name"),
          supabase.from("task_categories").select("*"),
          supabase.from("profiles").select("*").order("full_name"),
          supabase.from("task_assignees").select("*"),
          supabase.from("task_labels").select("*"),
        ]);
        const refreshedAttachments = await Promise.all(
          (attachments ?? []).map(async (attachment) => {
            if (!attachment.file_path) return attachment;
            const signed = await supabase.storage
              .from("task-attachments")
              .createSignedUrl(attachment.file_path, 60 * 60);
            return signed.data?.signedUrl
              ? { ...attachment, url: signed.data.signedUrl }
              : attachment;
          }),
        );
        setData((current) => ({
          ...current,
          subtasks: subtasks ?? current.subtasks,
          comments: comments ?? current.comments,
          activity: activity ?? current.activity,
          attachments: attachments ? refreshedAttachments : current.attachments,
          labels: labels ?? current.labels,
          projects: projects ?? current.projects,
          categories: categories ?? current.categories,
          taskCategories: taskCategories ?? current.taskCategories,
          profiles: profiles ?? current.profiles,
          currentProfile: profiles
            ? (() => {
                const profile = profiles.find(
                  (item) => item.id === current.currentProfile.id,
                );
                return profile ?? current.currentProfile;
              })()
            : current.currentProfile,
          taskAssignees: taskAssignees ?? current.taskAssignees,
          taskLabels: taskLabels ?? current.taskLabels,
        }));
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
      void supabase.removeChannel(detailsChannel);
    };
  }, [demoMode, initialData.accessPreview]);

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
  const viewTitle = scopeName
    ? `${scopeName} ${visibility === "archived" ? "Archived Tasks" : view === "board" ? "Board" : "Tasks"}`
    : isMyTasks
      ? visibility === "archived"
        ? "My Archived Tasks"
        : "My Tasks"
      : visibility === "archived"
        ? "Archived Tasks"
        : view === "board"
          ? "Task Board"
          : "All Tasks";
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
      work_group_id: task.work_group_id,
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
    if (!draft.title.trim()) {
      setTaskMessage("A task title is required.");
      toast.error("A task title is required.");
      return;
    }
    if (!draft.status_id) {
      setTaskMessage("A status is required.");
      toast.error("A status is required.");
      return;
    }
    if (!draft.priority) {
      setTaskMessage("A priority is required.");
      toast.error("A priority is required.");
      return;
    }
    if (draft.category_ids.length === 0) {
      setTaskMessage("Select at least one category.");
      toast.error("Select at least one category.");
      return;
    }
    setTaskMessage("");
    setTaskSaving(true);
    const now = new Date().toISOString();
    if (demoMode) {
      const { category_ids: categoryIds, ...taskDraft } = draft;
      const task: Task = editing
        ? {
            ...editing,
            ...taskDraft,
            ...completionLifecycle(draft.status_id, data.statuses, editing),
            title: draft.title.trim(),
            updated_at: now,
          }
        : {
            ...taskDraft,
            ...completionLifecycle(draft.status_id, data.statuses),
            title: draft.title.trim(),
            id: crypto.randomUUID(),
            created_by: data.currentProfile.id,
            board_position:
              Math.max(
                0,
                ...data.tasks
                  .filter((item) => item.status_id === draft.status_id)
                  .map((item) => item.board_position),
              ) + 1024,
            created_at: now,
            updated_at: now,
          };
      setData((current) => ({
        ...current,
        tasks: editing
          ? current.tasks.map((item) => (item.id === editing.id ? task : item))
          : [task, ...current.tasks],
        taskCategories: [
          ...current.taskCategories.filter((item) => item.task_id !== task.id),
          ...categoryIds.map((category_id) => ({
            task_id: task.id,
            category_id,
          })),
        ],
      }));
    } else {
      const supabase = createClient();
      const { category_ids: categoryIds, ...taskDraft } = draft;
      if (editing) {
        const { error } = await supabase
          .from("tasks")
          .update({ ...taskDraft, title: draft.title.trim() })
          .eq("id", editing.id);
        if (error) {
          setTaskMessage(error.message);
          toast.error(error.message);
          setTaskSaving(false);
          return;
        }
        if (draft.assignee_id)
          await supabase.from("task_assignees").upsert({
            task_id: editing.id,
            profile_id: draft.assignee_id,
          });
        setData((current) => ({
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === editing.id
              ? {
                  ...task,
                  ...taskDraft,
                  ...completionLifecycle(
                    draft.status_id,
                    current.statuses,
                    task,
                  ),
                  title: draft.title.trim(),
                  updated_at: now,
                }
              : task,
          ),
        }));
        await supabase
          .from("task_categories")
          .delete()
          .eq("task_id", editing.id);
        if (categoryIds.length > 0)
          await supabase.from("task_categories").insert(
            categoryIds.map((category_id) => ({
              task_id: editing.id,
              category_id,
            })),
          );
        setData((current) => ({
          ...current,
          taskCategories: [
            ...current.taskCategories.filter(
              (item) => item.task_id !== editing.id,
            ),
            ...categoryIds.map((category_id) => ({
              task_id: editing.id,
              category_id,
            })),
          ],
        }));
      } else {
        const coreDraft = {
          title: draft.title,
          description: draft.description,
          status_id: draft.status_id,
          work_group_id: draft.work_group_id,
          project_id: draft.project_id,
          assignee_id: draft.assignee_id,
          start_date: draft.start_date,
          due_date: draft.due_date,
          priority: draft.priority,
        };
        const { data: saved, error } = await supabase
          .from("tasks")
          .insert({
            ...coreDraft,
            title: draft.title.trim(),
            created_by: data.currentProfile.id,
          })
          .select("*")
          .single();
        if (error || !saved) {
          const errorMessage =
            error?.message ?? "The task could not be created.";
          setTaskMessage(errorMessage);
          toast.error(errorMessage);
          setTaskSaving(false);
          return;
        }
        const task: Task = {
          ...saved,
          due_time: saved.due_time ?? null,
          reminder_at: saved.reminder_at ?? null,
        };
        setData((current) => ({
          ...current,
          tasks: [task, ...current.tasks.filter((item) => item.id !== task.id)],
        }));
        if (task.assignee_id)
          await supabase.from("task_assignees").upsert({
            task_id: task.id,
            profile_id: task.assignee_id,
          });
        if (categoryIds.length > 0) {
          const taskCategories = categoryIds.map((category_id) => ({
            task_id: task.id,
            category_id,
          }));
          await supabase.from("task_categories").insert(taskCategories);
          setData((current) => ({
            ...current,
            taskCategories: [...current.taskCategories, ...taskCategories],
          }));
        }
      }
    }
    setTaskSaving(false);
    if (!editing && createAnother) {
      setDraft({
        ...blankDraft(draft.status_id),
        status_id: draft.status_id,
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
  }

  async function removeTask(id: string) {
    setTaskDeleting(true);
    try {
      if (!demoMode) {
        const { error } = await createClient()
          .from("tasks")
          .delete()
          .eq("id", id);
        if (error) {
          toast.error(error.message);
          return;
        }
      }
      setData((current) => ({
        ...current,
        tasks: current.tasks.filter((item) => item.id !== id),
        subtasks: current.subtasks.filter((item) => item.task_id !== id),
        comments: current.comments.filter((item) => item.task_id !== id),
        activity: current.activity.filter((item) => item.task_id !== id),
        attachments: current.attachments.filter((item) => item.task_id !== id),
        taskAssignees: current.taskAssignees.filter(
          (item) => item.task_id !== id,
        ),
        taskLabels: current.taskLabels.filter((item) => item.task_id !== id),
        taskCategories: current.taskCategories.filter(
          (item) => item.task_id !== id,
        ),
      }));
      setTaskPendingDelete(null);
      setTaskOpen(false);
      toast.success("Task deleted.");
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
    const taskToMove = data.tasks.find((item) => item.id === id);
    if (!taskToMove || targetId === id) return;
    const destinationTasks = data.tasks
      .filter((item) => item.status_id === statusId && item.id !== id)
      .sort((a, b) => a.board_position - b.board_position);
    const targetIndex = targetId
      ? destinationTasks.findIndex((item) => item.id === targetId)
      : -1;
    let boardPosition: number;
    if (targetIndex < 0) {
      boardPosition = (destinationTasks.at(-1)?.board_position ?? 0) + 1024;
    } else if (edge === "before") {
      const targetPosition = destinationTasks[targetIndex].board_position;
      const previousPosition =
        destinationTasks[targetIndex - 1]?.board_position;
      boardPosition =
        previousPosition === undefined
          ? targetPosition - 1024
          : (previousPosition + targetPosition) / 2;
    } else {
      const targetPosition = destinationTasks[targetIndex].board_position;
      const nextPosition = destinationTasks[targetIndex + 1]?.board_position;
      boardPosition =
        nextPosition === undefined
          ? targetPosition + 1024
          : (targetPosition + nextPosition) / 2;
    }
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              status_id: statusId,
              board_position: boardPosition,
              ...completionLifecycle(statusId, current.statuses, task),
              updated_at: new Date().toISOString(),
            }
          : task,
      ),
    }));
    if (!demoMode) {
      const { error } = await createClient()
        .from("tasks")
        .update({ status_id: statusId, board_position: boardPosition })
        .eq("id", id);
      if (error) {
        setData((current) => ({
          ...current,
          tasks: current.tasks.map((item) =>
            item.id === id ? taskToMove : item,
          ),
        }));
        toast.error(error.message);
      }
    }
  }

  const filterCount =
    [assignee, group, project, status, priority].filter(
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
        className={`group w-full cursor-grab rounded-xl border border-black/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/20 active:cursor-grabbing dark:border-white/10 dark:bg-zinc-900 dark:hover:border-white/30 ${
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
          {viewingAsGroup ? (
            <Tooltip
              content="My Tasks is unavailable when viewing as an access group because a group is not a task assignee."
              placement="right"
              triggerClassName="w-full"
            >
              <button
                type="button"
                aria-disabled="true"
                className="sidebar-link w-full cursor-not-allowed opacity-40"
                onClick={(event) => event.preventDefault()}
              >
                <FiUser />
                My Tasks
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={() => {
                if (isMyTasks) {
                  setAssignee("all");
                  setSidebarOpen(false);
                  return;
                }
                setAssignee(myTasksName);
                setGroup("all");
                setProject("all");
                setStatus("all");
                setPriority("all");
                setVisibility("active");
                setView("list");
                setSidebarOpen(false);
              }}
              className={`sidebar-link ${isMyTasks ? "sidebar-link-active" : ""}`}
            >
              <FiUser />
              My Tasks
            </button>
          )}
          <button
            onClick={() => {
              setView("board");
              setSidebarOpen(false);
            }}
            className={`sidebar-link ${view === "board" ? "sidebar-link-active" : ""}`}
          >
            <FiGrid />
            Board
          </button>
          <button
            onClick={() => {
              setView("list");
              setSidebarOpen(false);
            }}
            className={`sidebar-link ${view === "list" ? "sidebar-link-active" : ""}`}
          >
            <FiList />
            List
          </button>
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
                    onClick={() => setWorkGroupsOpen(true)}
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
        <div className="shrink-0 space-y-2 border-t border-black/10 pt-4 dark:border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            {demoMode ? (
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar
                  name={profileName(data.currentProfile)}
                  src={data.currentProfile.avatar_url}
                />
                <ProfileSummary
                  name={profileName(data.currentProfile)}
                  role={data.currentProfile.app_role}
                  demo
                />
              </div>
            ) : (
              <Link
                href="/profile"
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/40"
              >
                <Avatar
                  name={profileName(data.currentProfile)}
                  src={data.currentProfile.avatar_url}
                />
                <ProfileSummary
                  name={profileName(data.currentProfile)}
                  role={data.currentProfile.app_role}
                />
              </Link>
            )}
            {!demoMode && (
              <Tooltip content="Sign out" placement="right">
                <IconButton
                  tooltip={false}
                  label="Sign out"
                  onClick={async () => {
                    await createClient().auth.signOut();
                    location.assign("/login");
                  }}
                >
                  <FiLogOut />
                </IconButton>
              </Tooltip>
            )}
          </div>
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
            <div className="flex rounded-lg border border-black/10 bg-white p-1 dark:border-white/10 dark:bg-white/5">
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
                  onClick={() => {
                    setAssignee("all");
                    setGroup("all");
                    setProject("all");
                    setStatus("all");
                    setPriority("all");
                    setVisibility("active");
                  }}
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
                          contentClassName="space-y-3"
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
          </div>
        </div>
      </main>

      <Modal
        open={taskOpen}
        setIsOpen={setTaskOpen}
        title={editing ? "Edit task" : "A new thing to do"}
        hideActions
        size={editing && taskDetailsOpen ? "2xl" : "lg"}
        panelClassName="transition-[max-width] duration-300 ease-out motion-reduce:transition-none"
        footer={
          <div className="grid w-full gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            {editing && (
              <Button
                type="button"
                variant="danger"
                className="w-fit justify-self-start whitespace-nowrap"
                leftIcon={<FiTrash2 />}
                onClick={() => setTaskPendingDelete(editing)}
              >
                Delete task
              </Button>
            )}
            {!editing && (
              <label className="flex w-fit cursor-pointer items-center gap-3 text-sm font-medium text-black/70 dark:text-white/70">
                <input
                  type="checkbox"
                  checked={createAnother}
                  onChange={(event) => setCreateAnother(event.target.checked)}
                  disabled={taskSaving}
                  className="h-4 w-4 rounded border-black/20 accent-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:accent-white dark:focus-visible:ring-white/40"
                />
                Create another
              </label>
            )}
            <div className="flex flex-col gap-3 sm:col-start-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                className="whitespace-nowrap"
                onClick={() => setTaskOpen(false)}
                disabled={taskSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="task-editor-form"
                className="whitespace-nowrap"
                loading={taskSaving}
                loadingText="Saving..."
              >
                {editing ? "Save changes" : "Create task"}
              </Button>
            </div>
          </div>
        }
      >
        <form
          id="task-editor-form"
          className="min-w-0 space-y-5"
          onSubmit={saveTask}
        >
          <div
            className={
              editing
                ? taskDetailsOpen
                  ? "grid items-start transition-[grid-template-columns,gap] duration-300 ease-out motion-reduce:transition-none lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8"
                  : "grid items-start transition-[grid-template-columns,gap] duration-300 ease-out motion-reduce:transition-none lg:grid-cols-[minmax(0,1fr)_0fr] lg:gap-0"
                : ""
            }
          >
            <div className="min-w-0 space-y-5">
              <Input
                label="Task title"
                name="task-title"
                required
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
                placeholder="What needs doing?"
              />
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="task-description"
                  className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-black/70 sm:tracking-[0.3em] dark:text-white/70"
                >
                  Description
                </label>
                <RichTextarea
                  id="task-description"
                  name="description"
                  aria-label="Description"
                  value={draft.description ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                  placeholder="Add useful context, links, or a tiny pep talk…"
                />
              </div>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <DropdownSelect
                  variant="field"
                  label="Status"
                  required
                  value={draft.status_id}
                  onChange={(value) => setDraft({ ...draft, status_id: value })}
                  options={statuses.map((item) => ({
                    label: item.name,
                    value: item.id,
                  }))}
                />
                <DropdownSelect
                  variant="field"
                  label="Priority"
                  required
                  value={draft.priority}
                  onChange={(value) =>
                    setDraft({ ...draft, priority: value as Priority })
                  }
                  options={priorities.map((item) => ({
                    label: item[0].toUpperCase() + item.slice(1),
                    value: item,
                  }))}
                />
                <fieldset className="sm:col-span-2" aria-required="true">
                  <legend className="mb-2 flex gap-1 text-sm font-semibold">
                    <span>Categories</span>
                    <span className="text-red-500">*</span>
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {data.categories.map((item) => {
                      const selected = draft.category_ids.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition focus-within:ring-2 focus-within:ring-black/20 dark:focus-within:ring-white/30 ${
                            selected
                              ? "border-black/25 bg-black text-white dark:border-white/30 dark:bg-white dark:text-black"
                              : "border-black/10 bg-white dark:border-white/10 dark:bg-white/5"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={selected}
                            onChange={() =>
                              setDraft({
                                ...draft,
                                category_ids: selected
                                  ? draft.category_ids.filter(
                                      (id) => id !== item.id,
                                    )
                                  : [...draft.category_ids, item.id],
                              })
                            }
                          />
                          <i
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.name}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <DropdownSelect
                  variant="field"
                  label="Project"
                  value={draft.project_id ?? ""}
                  onChange={(value) =>
                    setDraft({ ...draft, project_id: value || null })
                  }
                  options={[
                    { label: "No project", value: "" },
                    ...data.projects
                      .filter(
                        (item) =>
                          !item.archived_at || item.id === draft.project_id,
                      )
                      .map((item) => ({
                        label: `${item.name}${item.archived_at ? " (archived)" : ""}`,
                        value: item.id,
                      })),
                  ]}
                />
                <DropdownSelect
                  variant="field"
                  label="Assignee"
                  value={draft.assignee_id ?? ""}
                  onChange={(value) =>
                    setDraft({ ...draft, assignee_id: value || null })
                  }
                  options={[
                    { label: "Unassigned", value: "" },
                    ...data.profiles.map((item) => ({
                      avatar: {
                        name: profileName(item),
                        src: item.avatar_url,
                      },
                      label: profileName(item),
                      value: item.id,
                    })),
                  ]}
                />
                <label className="date-field">
                  <span>Due date</span>
                  <input
                    type="date"
                    value={draft.due_date ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        due_date: event.target.value || null,
                      })
                    }
                  />
                </label>
                <label className="date-field opacity-60">
                  <span className="items-center">
                    Reminder
                    <Pill
                      size="sm"
                      className="!px-2 !py-0 text-[8px] leading-3 !tracking-[0.18em]"
                    >
                      Coming soon
                    </Pill>
                  </span>
                  <input
                    type="datetime-local"
                    value=""
                    disabled
                    aria-label="Reminder (coming soon)"
                    className="cursor-not-allowed"
                  />
                </label>
              </div>
              {editing && !taskDetailsOpen && (
                <button
                  type="button"
                  aria-expanded="false"
                  aria-controls="task-secondary-details"
                  className="group flex w-full items-center gap-4 rounded-xl border border-black/15 bg-black/[0.025] p-4 text-left transition hover:border-black/30 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/15 dark:bg-white/[0.035] dark:hover:border-white/30 dark:hover:bg-white/[0.07] dark:focus-visible:ring-white/30"
                  onClick={() => setTaskDetailsOpen(true)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      Task details
                    </span>
                    <span className="mt-1 block text-xs text-black/55 dark:text-white/55">
                      Checklist, attachments, comments, and activity
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-black/55 dark:text-white/55">
                    Show
                    <FiChevronDown className="transition-transform group-hover:translate-y-0.5 motion-reduce:transform-none" />
                  </span>
                </button>
              )}
            </div>
            {editing && (
              <AnimatedCollapse
                id="task-secondary-details"
                open={taskDetailsOpen}
                className="min-w-0"
                contentClassName="min-w-0 lg:border-l lg:border-black/10 lg:pl-8 lg:dark:border-white/10"
              >
                <div className="mb-5 flex items-center justify-between gap-3 border-b border-black/10 pb-3 dark:border-white/10">
                  <div>
                    <p className="text-sm font-semibold">Task details</p>
                    <p className="text-xs text-black/55 dark:text-white/55">
                      Checklist, files, conversation, and history
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    rightIcon={<FiChevronDown className="rotate-180" />}
                    aria-expanded="true"
                    aria-controls="task-secondary-details"
                    onClick={() => setTaskDetailsOpen(false)}
                  >
                    Hide details
                  </Button>
                </div>
                <TaskDetails
                  className="!border-t-0 !pt-0"
                  task={editing}
                  data={data}
                  setData={setData}
                  demoMode={demoMode}
                />
              </AnimatedCollapse>
            )}
          </div>
          <ErrorCallout>{taskMessage}</ErrorCallout>
        </form>
      </Modal>
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
      {workGroupsOpen && (
        <CategoriesModal
          open={workGroupsOpen}
          setOpen={setWorkGroupsOpen}
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

export function WorkGroupsModalLegacy({
  open,
  setOpen,
  data,
  setData,
  demoMode,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  demoMode: boolean;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ee1a25");
  const [message, setMessage] = useState("");
  const [groupToRename, setGroupToRename] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [groupActionPending, setGroupActionPending] = useState(false);

  function randomizeColor() {
    const choices = workGroupColors.filter((option) => option !== color);
    setColor(choices[Math.floor(Math.random() * choices.length)]);
  }

  async function addWorkGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const groupName = name.trim();
    if (!groupName) return;
    setMessage("");
    const item = {
      id: crypto.randomUUID(),
      name: groupName,
      description: null,
      color,
      created_by: data.currentProfile.id,
    };
    if (!demoMode) {
      const { data: saved, error } = await createClient()
        .from("work_groups")
        .insert(item)
        .select()
        .single();
      if (error) {
        setMessage(error.message);
        return;
      }
      if (saved) item.id = saved.id;
    }
    setData((current) => ({
      ...current,
      workGroups: [...current.workGroups, item],
    }));
    setName("");
    setMessage("Work group created.");
  }

  async function renameWorkGroup(
    id: string,
    currentName: string,
    nextName: string,
  ) {
    if (!nextName || nextName === currentName) return;
    setGroupActionPending(true);
    if (!demoMode) {
      const { error } = await createClient()
        .from("work_groups")
        .update({ name: nextName })
        .eq("id", id);
      if (error) {
        setMessage(error.message);
        setGroupActionPending(false);
        return;
      }
    }
    setData((current) => ({
      ...current,
      workGroups: current.workGroups.map((item) =>
        item.id === id ? { ...item, name: nextName } : item,
      ),
    }));
    setGroupToRename(null);
    setGroupActionPending(false);
  }

  async function deleteWorkGroup(id: string) {
    setGroupActionPending(true);
    if (!demoMode) {
      const { error } = await createClient()
        .from("work_groups")
        .delete()
        .eq("id", id);
      if (error) {
        setMessage(error.message);
        setGroupActionPending(false);
        return;
      }
    }
    setData((current) => ({
      ...current,
      workGroups: current.workGroups.filter((item) => item.id !== id),
      tasks: current.tasks.map((task) =>
        task.work_group_id === id ? { ...task, work_group_id: null } : task,
      ),
    }));
    setGroupToDelete(null);
    setGroupActionPending(false);
  }

  return (
    <>
      <Modal
        open={open}
        setIsOpen={setOpen}
        title="Work groups"
        hideActions
        size="xl"
      >
        <div className="space-y-3">
          {data.workGroups.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-black/10 p-3 dark:border-white/10"
            >
              <i
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="min-w-0 flex-1 truncate font-semibold">
                {item.name}
              </span>
              <IconButton
                label={`Rename ${item.name}`}
                onClick={() => setGroupToRename(item)}
              >
                <FiMoreHorizontal />
              </IconButton>
              <IconButton
                label={`Delete ${item.name}`}
                variant="danger"
                onClick={() => setGroupToDelete(item)}
              >
                <FiTrash2 />
              </IconButton>
            </div>
          ))}
        </div>
        <form
          className="mt-5 grid gap-3 border-t border-black/10 pt-5 dark:border-white/10 lg:grid-cols-[minmax(16rem,1fr)_auto_auto_auto]"
          onSubmit={addWorkGroup}
        >
          <Input
            label="New work group"
            name="work-group-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
          />
          <label className="date-field">
            <span>Color</span>
            <input
              type="color"
              className="color-input"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            className="self-end"
            leftIcon={<FiRefreshCw />}
            onClick={randomizeColor}
          >
            Randomize
          </Button>
          <div className="flex items-end justify-end gap-2 lg:col-span-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="action">
              Create group
            </Button>
          </div>
          {message && (
            <p
              role="status"
              className="text-sm text-black/60 dark:text-white/60 sm:col-span-3"
            >
              {message}
            </p>
          )}
        </form>
      </Modal>
      <PromptDialog
        open={Boolean(groupToRename)}
        setOpen={(nextOpen) => {
          if (!nextOpen) setGroupToRename(null);
        }}
        title="Rename work group"
        label="Work group name"
        initialValue={groupToRename?.name}
        pending={groupActionPending}
        onConfirm={(nextName) => {
          if (groupToRename)
            void renameWorkGroup(
              groupToRename.id,
              groupToRename.name,
              nextName,
            );
        }}
      />
      <ConfirmationDialog
        open={Boolean(groupToDelete)}
        setOpen={(nextOpen) => {
          if (!nextOpen) setGroupToDelete(null);
        }}
        title="Delete work group?"
        description="Tasks in this work group will become ungrouped."
        confirmLabel="Delete work group"
        pendingLabel="Deleting..."
        pending={groupActionPending}
        destructive
        onConfirm={() => {
          if (groupToDelete) void deleteWorkGroup(groupToDelete.id);
        }}
      />
    </>
  );
}

export function StatusSettingsModal({
  open,
  setOpen,
  data,
  setData,
  demoMode,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  demoMode: boolean;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ee1a25");
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingStatusName, setEditingStatusName] = useState("");
  const [statusToDelete, setStatusToDelete] = useState<
    WorkspaceData["statuses"][number] | null
  >(null);
  const [settingActionPending, setSettingActionPending] = useState(false);

  async function statusRequest<T>(
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, unknown>,
  ) {
    const response = await fetch("/api/statuses", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as T & { error?: string };
    if (!response.ok || result.error)
      throw new Error(result.error ?? "The status change could not be saved.");
    return result;
  }

  async function add() {
    const nextName = name.trim();
    if (!nextName || settingActionPending) return;
    setSettingActionPending(true);
    let item: WorkspaceData["statuses"][number] = {
      id: crypto.randomUUID(),
      name: nextName,
      color,
      sort_order: data.statuses.length,
      is_default: false,
      is_completed: false,
    };
    try {
      if (!demoMode) {
        const result = await statusRequest<{ status: typeof item }>("POST", {
          name: item.name,
          color: item.color,
        });
        item = result.status;
      }
      setData((current) => ({
        ...current,
        statuses: [...current.statuses, item],
      }));
      setName("");
      toast.success(`${item.name} added.`);
    } catch (error) {
      toast.error(
        mutationErrorMessage(error, "The status could not be added."),
      );
    } finally {
      setSettingActionPending(false);
    }
  }

  async function renameSetting(
    id: string,
    currentName: string,
    nextName: string,
  ) {
    if (!nextName) return;
    if (nextName === currentName) {
      setEditingStatusId(null);
      setEditingStatusName("");
      return;
    }
    setSettingActionPending(true);
    try {
      if (!demoMode) {
        await statusRequest("PATCH", { id, name: nextName });
      }
      setData((current) => ({
        ...current,
        statuses: current.statuses.map((item) =>
          item.id === id ? { ...item, name: nextName } : item,
        ),
      }));
      setEditingStatusId(null);
      setEditingStatusName("");
      toast.success(`${nextName} updated.`);
    } catch (error) {
      toast.error(
        mutationErrorMessage(error, "The status could not be renamed."),
      );
    } finally {
      setSettingActionPending(false);
    }
  }

  async function deleteSetting(id: string) {
    setSettingActionPending(true);
    try {
      if (!demoMode) await statusRequest("DELETE", { id });
      setData((current) => ({
        ...current,
        statuses: current.statuses.filter((item) => item.id !== id),
      }));
      setStatusToDelete(null);
      toast.success("Status deleted.");
    } catch (error) {
      toast.error(
        mutationErrorMessage(error, "The status could not be deleted."),
      );
    } finally {
      setSettingActionPending(false);
    }
  }

  async function toggleCompletedStatus(id: string, isCompleted: boolean) {
    setSettingActionPending(true);
    try {
      if (!demoMode) {
        await statusRequest("PATCH", { id, isCompleted });
      }
      const now = new Date().toISOString();
      setData((current) => ({
        ...current,
        statuses: current.statuses.map((item) =>
          item.id === id ? { ...item, is_completed: isCompleted } : item,
        ),
        tasks: current.tasks.map((task) => {
          if (task.status_id !== id) return task;
          return {
            ...task,
            ...(isCompleted
              ? {
                  completed_at: task.completed_at ?? now,
                  archived_at:
                    task.archived_at ??
                    new Date(
                      new Date(now).getTime() + archiveDelayMs,
                    ).toISOString(),
                }
              : { completed_at: null, archived_at: null }),
          };
        }),
      }));
      toast.success(
        isCompleted
          ? "Tasks in this status will archive after 14 days."
          : "This is now an active status.",
      );
    } catch (error) {
      toast.error(
        mutationErrorMessage(error, "The status could not be updated."),
      );
    } finally {
      setSettingActionPending(false);
    }
  }

  async function moveStatus(id: string, direction: -1 | 1) {
    if (settingActionPending) return;
    const ordered = [...data.statuses].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const index = ordered.findIndex((item) => item.id === id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return;
    [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];
    const next = ordered.map((item, sort_order) => ({ ...item, sort_order }));
    setSettingActionPending(true);
    try {
      if (!demoMode) {
        const result = await statusRequest<{
          statuses: WorkspaceData["statuses"];
        }>("PATCH", { orderedIds: next.map((item) => item.id) });
        const savedById = new Map(
          result.statuses.map((status) => [status.id, status]),
        );
        next.splice(
          0,
          next.length,
          ...next.map((status) => savedById.get(status.id) ?? status),
        );
      }
      setData((current) => ({ ...current, statuses: next }));
    } catch (error) {
      toast.error(
        mutationErrorMessage(error, "The status order could not be saved."),
      );
    } finally {
      setSettingActionPending(false);
    }
  }
  return (
    <>
      <Modal
        open={open}
        setIsOpen={setOpen}
        title="Status settings"
        description="Completion statuses mark tasks complete when they enter the column and automatically archive them after 14 days. Moving a task back to an active status reopens it."
        hideActions
        size="lg"
        maxHeight="min(42rem, calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom))))"
        footer={
          <form
            id="create-status-form"
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void add();
            }}
          >
            <Input
              label="New status"
              name="setting-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name"
            />
            <label className="date-field">
              <span>Color</span>
              <input
                type="color"
                className="color-input"
                value={color}
                onChange={(event) => setColor(event.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={settingActionPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={settingActionPending}
                loadingText="Adding..."
              >
                Add status
              </Button>
            </div>
          </form>
        }
      >
        <>
          <div className="space-y-3">
            {[...data.statuses]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-black/10 p-3 dark:border-white/10"
                >
                  <i
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {editingStatusId === item.id ? (
                    <form
                      className="flex min-w-0 flex-1 items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void renameSetting(
                          item.id,
                          item.name,
                          editingStatusName.trim(),
                        );
                      }}
                    >
                      <Input
                        label={`Status name for ${item.name}`}
                        hideLabel
                        name={`status-name-${item.id}`}
                        value={editingStatusName}
                        onChange={(event) =>
                          setEditingStatusName(event.target.value)
                        }
                        inputClassName="h-9"
                        autoFocus
                      />
                      <IconButton
                        type="submit"
                        label={`Save ${item.name}`}
                        disabled={
                          settingActionPending || !editingStatusName.trim()
                        }
                      >
                        <FiCheck />
                      </IconButton>
                      <IconButton
                        type="button"
                        label={`Cancel editing ${item.name}`}
                        disabled={settingActionPending}
                        onClick={() => {
                          setEditingStatusId(null);
                          setEditingStatusName("");
                        }}
                      >
                        <FiX />
                      </IconButton>
                    </form>
                  ) : (
                    <span className="flex-1 font-semibold">{item.name}</span>
                  )}
                  {editingStatusId !== item.id && (
                    <>
                      {"is_default" in item && item.is_default && (
                        <Pill size="sm">Default</Pill>
                      )}
                      <button
                        type="button"
                        aria-label={`${item.name} ${item.is_completed ? "currently completes tasks and archives them after 14 days" : "is an active workflow status"}`}
                        aria-pressed={item.is_completed}
                        disabled={settingActionPending}
                        onClick={() =>
                          void toggleCompletedStatus(
                            item.id,
                            !item.is_completed,
                          )
                        }
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-black/20 disabled:opacity-50 dark:focus:ring-white/30 ${item.is_completed ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200" : "border-black/10 text-black/60 hover:text-black dark:border-white/10 dark:text-white/60 dark:hover:text-white"}`}
                      >
                        {item.is_completed
                          ? "Completes tasks"
                          : "Set as completion"}
                      </button>
                      <IconButton
                        label={`Move ${item.name} up`}
                        onClick={() => void moveStatus(item.id, -1)}
                      >
                        <FiChevronDown className="rotate-180" />
                      </IconButton>
                      <IconButton
                        label={`Move ${item.name} down`}
                        onClick={() => void moveStatus(item.id, 1)}
                      >
                        <FiChevronDown />
                      </IconButton>
                      <IconButton
                        label={`Edit ${item.name}`}
                        disabled={settingActionPending}
                        onClick={() => {
                          setEditingStatusId(item.id);
                          setEditingStatusName(item.name);
                        }}
                      >
                        <FiEdit2 />
                      </IconButton>
                      <IconButton
                        label={`Delete ${item.name}`}
                        variant="danger"
                        onClick={() => setStatusToDelete(item)}
                      >
                        <FiTrash2 />
                      </IconButton>
                    </>
                  )}
                </div>
              ))}
          </div>
        </>
      </Modal>
      <ConfirmationDialog
        open={Boolean(statusToDelete)}
        setOpen={(nextOpen) => {
          if (!nextOpen) setStatusToDelete(null);
        }}
        title="Delete status?"
        description={
          statusToDelete &&
          "is_default" in statusToDelete &&
          statusToDelete.is_default
            ? "This is a default status. Tasks using it must be moved before it can be deleted."
            : "This shared status will be permanently deleted."
        }
        confirmLabel="Delete status"
        pendingLabel="Deleting..."
        pending={settingActionPending}
        destructive
        onConfirm={() => {
          if (statusToDelete) void deleteSetting(statusToDelete.id);
        }}
      />
    </>
  );
}
