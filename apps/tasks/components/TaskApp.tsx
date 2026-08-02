"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  Button,
  Card,
  ConfirmationDialog,
  DropdownSelect,
  EmptyState,
  ErrorCallout,
  Heading,
  IconButton,
  Input,
  Modal,
  Pill,
  PromptDialog,
  SuccessCallout,
  Textarea,
  Tooltip,
  toast,
} from "@ryanmeetup/ui";
import {
  FiCalendar,
  FiBell,
  FiCheck,
  FiChevronDown,
  FiFilter,
  FiFolder,
  FiGrid,
  FiList,
  FiLogOut,
  FiMenu,
  FiMoreHorizontal,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { useQueryParamState, useSearchFilter } from "@ryanmeetup/hooks";
import type { Category, Priority, Task, WorkspaceData } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";
import { TaskDetails } from "./TaskDetails";
import { WorkGroupsModal as CategoriesModal } from "./WorkGroupsModal";
import { ProjectsModal } from "./ProjectsModal";

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

function initials(name?: string | null) {
  return (name || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function displayDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function displayDue(task: Task) {
  const date = displayDate(task.due_date);
  if (!task.due_time) return date;
  const [hours, minutes] = task.due_time.split(":").map(Number);
  return `${date}, ${new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hours, minutes))}`;
}

function profileName(profile: { full_name: string }) {
  return profile.full_name || "Teammate";
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

function Avatar({
  name,
  small = false,
}: {
  name?: string | null;
  small?: boolean;
}) {
  return (
    <span
      title={name || "Teammate"}
      className={`inline-grid shrink-0 place-items-center rounded-full border border-black/10 bg-black text-[9px] font-bold text-white dark:border-white/20 dark:bg-white dark:text-black ${small ? "h-6 w-6" : "h-8 w-8"}`}
    >
      <span>{initials(name)}</span>
    </span>
  );
}

export function TaskApp({
  initialData,
  demoMode,
}: {
  initialData: WorkspaceData;
  demoMode: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [viewParam, setView] = useQueryParamState("view", "board");
  const view: View = viewParam === "list" ? "list" : "board";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workGroupsOpen, setWorkGroupsOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [taskMessage, setTaskMessage] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null);
  const [taskDeleting, setTaskDeleting] = useState(false);
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);
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
  const [sort, setSort] = useState("updated");

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
            tasks: restored.tasks.map((task) => ({
              ...task,
              due_time: task.due_time ?? null,
              reminder_at: task.reminder_at ?? null,
              project_id: task.project_id ?? null,
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
    if (demoMode) return;
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
          { data: projectOwners },
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
          supabase.from("project_owners").select("*"),
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
          projectOwners: projectOwners ?? current.projectOwners,
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
  }, [demoMode]);

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
  const scopeName = selectedProject?.name ?? selectedCategory?.name;
  const viewTitle = scopeName
    ? `${scopeName} ${view === "board" ? "Board" : "Tasks"}`
    : view === "board"
      ? "Task Board"
      : "All Tasks";
  useEffect(() => {
    document.title = `${viewTitle} · Ryan Meetup`;
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
            (priority === "all" || task.priority === selectedPriority)
          );
        })
        .sort((a, b) =>
          sort === "due"
            ? (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999")
            : sort === "priority"
              ? priorities.indexOf(b.priority) - priorities.indexOf(a.priority)
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
      selectedStatus,
    ],
  );

  function openCreate(statusId?: string) {
    setTaskMessage("");
    setEditing(null);
    setDraft(blankDraft(statusId ?? statuses[1]?.id ?? statuses[0]?.id ?? ""));
    setTaskOpen(true);
  }

  function openEdit(task: Task) {
    setTaskMessage("");
    setEditing(task);
    setDraft({
      title: task.title,
      description: task.description,
      status_id: task.status_id,
      work_group_id: task.work_group_id,
      project_id: task.project_id,
      category_ids: [...(categoriesByTask.get(task.id) ?? [])],
      assignee_id: task.assignee_id,
      start_date: task.start_date,
      due_date: task.due_date,
      due_time: task.due_time,
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
    setTaskMessage("");
    setTaskSaving(true);
    const now = new Date().toISOString();
    if (demoMode) {
      const { category_ids: categoryIds, ...taskDraft } = draft;
      const task: Task = editing
        ? {
            ...editing,
            ...taskDraft,
            title: draft.title.trim(),
            updated_at: now,
          }
        : {
            ...taskDraft,
            title: draft.title.trim(),
            id: crypto.randomUUID(),
            created_by: data.currentProfile.id,
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

  async function moveTask(id: string, statusId: string) {
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              status_id: statusId,
              updated_at: new Date().toISOString(),
            }
          : task,
      ),
    }));
    if (!demoMode)
      await createClient()
        .from("tasks")
        .update({ status_id: statusId })
        .eq("id", id);
  }

  const filterCount = [assignee, group, project, status, priority].filter(
    (value) => value !== "all",
  ).length;
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
    const taskLabels = data.taskLabels
      .filter((item) => item.task_id === task.id)
      .map((item) => data.labels.find((label) => label.id === item.label_id))
      .filter((label) => label !== undefined);
    return (
      <button
        draggable
        onDragStart={(event) => {
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
        onDragEnd={() => setDragOverStatusId(null)}
        onClick={() => openEdit(task)}
        key={task.id}
        className="group w-full cursor-grab rounded-xl border border-black/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/20 active:cursor-grabbing dark:border-white/10 dark:bg-zinc-900 dark:hover:border-white/30"
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
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-black/60 dark:text-white/60">
            {task.description}
          </p>
        )}
        {(taskLabels.length > 0 || taskSubtasks.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {taskLabels.map((label) => (
              <span
                key={label.id}
                className="rounded-full px-2 py-0.5 text-[9px] font-semibold text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}
            {taskSubtasks.length > 0 && (
              <span className="ml-auto text-[10px] font-semibold text-black/50 dark:text-white/50">
                ✓ {completedSubtasks}/{taskSubtasks.length}
              </span>
            )}
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
                {displayDue(task)}
              </span>
            )}
            {task.reminder_at && (
              <span className="flex items-center gap-1.5 text-[11px] text-black/55 dark:text-white/55">
                <FiBell />
                Reminder{" "}
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(task.reminder_at))}
              </span>
            )}
          </div>
          {taskPeople.length > 0 ? (
            <span className="flex -space-x-1.5">
              {taskPeople.slice(0, 3).map((person) => (
                <Avatar key={person.id} name={profileName(person)} small />
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
          <div>
            <p className="font-cooper text-2xl uppercase">Ryan Meetup</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-black/45 dark:text-white/45">
              Task tracker
            </p>
          </div>
          <IconButton
            label="Close navigation"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <FiX />
          </IconButton>
        </div>
        <nav className="mt-8 space-y-1" aria-label="Main navigation">
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
        <div className="mt-8">
          <div className="flex items-center justify-between px-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
              Categories
            </p>
            <button
              className="text-[10px] font-semibold text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
              onClick={() => setWorkGroupsOpen(true)}
            >
              Manage
            </button>
          </div>
          <div className="mt-2 space-y-1">
            {data.categories.map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  setGroup(selectedCategory?.id === item.id ? "all" : item.name)
                }
                className={`sidebar-link ${selectedCategory?.id === item.id ? "sidebar-link-active" : ""}`}
              >
                <i
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between px-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
              Projects
            </p>
            <button
              className="text-[10px] font-semibold text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
              onClick={() => setProjectsOpen(true)}
            >
              Manage
            </button>
          </div>
          <div className="mt-2 space-y-1">
            {activeProjects.map((item) => (
              <Tooltip
                key={item.id}
                content={item.name}
                placement="right"
                triggerClassName="w-full"
              >
                <button
                  onClick={() =>
                    setProject(
                      selectedProject?.id === item.id ? "all" : item.name,
                    )
                  }
                  className={`sidebar-link ${selectedProject?.id === item.id ? "sidebar-link-active" : ""}`}
                >
                  <FiFolder />
                  <span className="truncate">{item.name}</span>
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
        <div className="mt-auto space-y-2 border-t border-black/10 pt-4 dark:border-white/10">
          <button
            className="sidebar-link"
            onClick={() => setSettingsOpen(true)}
          >
            <FiSettings />
            Team settings
          </button>
          {!demoMode && (
            <Button.Link
              href="/profile"
              variant="ghost"
              size="sm"
              className="sidebar-link !w-full !justify-start !px-3 !py-2 !normal-case !tracking-normal"
              leftIcon={<FiUser />}
            >
              My profile
            </Button.Link>
          )}
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={profileName(data.currentProfile)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {profileName(data.currentProfile)}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-black/45 dark:text-white/45">
                Team member
                {demoMode ? " · Demo" : ""}
              </p>
            </div>
            {!demoMode && (
              <Tooltip content="Sign out" placement="right">
                <IconButton
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
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu />
          </IconButton>
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
            <input
              aria-label="Search tasks"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks…"
              className="h-10 w-full rounded-lg border border-black/10 bg-white pl-10 pr-3 text-sm outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-white/5 dark:focus:border-white/30"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button
              size="sm"
              leftIcon={<FiPlus />}
              onClick={() => openCreate()}
            >
              New task
            </Button>
            <ThemeToggle />
          </div>
        </header>
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
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </Card>

          {view === "board" ? (
            <div className="grid auto-cols-[minmax(270px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-5 xl:auto-cols-auto xl:grid-flow-row xl:grid-cols-5">
              {statuses.map((item) => {
                const columnTasks = visibleTasks.filter(
                  (task) => task.status_id === item.id,
                );
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
                      void moveTask(
                        event.dataTransfer.getData("text/task-id"),
                        item.id,
                      );
                    }}
                    className={`min-h-[420px] rounded-2xl p-3 transition-[background-color,box-shadow] ${
                      dragOverStatusId === item.id
                        ? "bg-black/[0.07] ring-2 ring-inset ring-black/30 dark:bg-white/[0.09] dark:ring-white/40"
                        : "bg-black/[0.035] dark:bg-white/[0.035]"
                    }`}
                  >
                    <div className="mb-3 flex items-center gap-2 px-1">
                      <i
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <h2 className="text-xs font-bold uppercase tracking-[0.16em]">
                        {item.name}
                      </h2>
                      <span className="text-xs text-black/40 dark:text-white/40">
                        {columnTasks.length}
                      </span>
                      <button
                        aria-label={`Add task to ${item.name}`}
                        className="ml-auto rounded p-1 text-black/40 hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                        onClick={() => openCreate(item.id)}
                      >
                        <FiPlus />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {columnTasks.map(taskCard)}
                      {columnTasks.length === 0 && (
                        <button
                          onClick={() => openCreate(item.id)}
                          className="w-full rounded-xl border border-dashed border-black/15 px-3 py-8 text-xs text-black/40 hover:border-black/30 hover:text-black/60 dark:border-white/15 dark:text-white/40 dark:hover:border-white/30 dark:hover:text-white/60"
                        >
                          Drop a task here or add one
                        </button>
                      )}
                    </div>
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
                                style={{ backgroundColor: itemStatus?.color }}
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
                                      small
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
      </main>

      <Modal
        open={taskOpen}
        setIsOpen={setTaskOpen}
        title={editing ? "Edit task" : "A new thing to do"}
        hideActions
        size={editing ? "2xl" : "lg"}
      >
        <form className="min-w-0 space-y-5" onSubmit={saveTask}>
          <div
            className={
              editing
                ? "grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
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
              <Textarea
                id="task-description"
                label="Description"
                name="description"
                value={draft.description ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
                placeholder="Add useful context, links, or a tiny pep talk…"
                rows={4}
              />
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <DropdownSelect
                  variant="field"
                  label="Status"
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
                  value={draft.priority}
                  onChange={(value) =>
                    setDraft({ ...draft, priority: value as Priority })
                  }
                  options={priorities.map((item) => ({
                    label: item[0].toUpperCase() + item.slice(1),
                    value: item,
                  }))}
                />
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 text-sm font-semibold">
                    Categories
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
                      label: profileName(item),
                      value: item.id,
                    })),
                  ]}
                />
                <label className="date-field">
                  <span>Start date</span>
                  <input
                    type="date"
                    value={draft.start_date ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        start_date: event.target.value || null,
                      })
                    }
                  />
                </label>
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
                {editing && (
                  <label className="date-field">
                    <span>Due time</span>
                    <input
                      type="time"
                      value={draft.due_time ?? ""}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          due_time: event.target.value || null,
                        })
                      }
                    />
                  </label>
                )}
                {editing && (
                  <label className="date-field">
                    <span>Reminder</span>
                    <input
                      type="datetime-local"
                      value={draft.reminder_at?.slice(0, 16) ?? ""}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          reminder_at: event.target.value
                            ? new Date(event.target.value).toISOString()
                            : null,
                        })
                      }
                    />
                  </label>
                )}
              </div>
            </div>
            {editing && (
              <TaskDetails
                className="!border-t-0 !pt-0 lg:border-l lg:border-black/10 lg:pl-8 lg:dark:border-white/10"
                task={editing}
                data={data}
                setData={setData}
                demoMode={demoMode}
              />
            )}
          </div>
          <ErrorCallout>{taskMessage}</ErrorCallout>
          <div className="sticky -bottom-6 z-10 -mx-6 flex justify-end border-t border-black/10 bg-white px-6 pb-1 pt-5 dark:border-white/10 dark:bg-[#181818]">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
              {editing && (
                <Button
                  type="button"
                  variant="ghost"
                  className="whitespace-nowrap text-red-600 dark:text-red-400"
                  leftIcon={<FiTrash2 />}
                  onClick={() => setTaskPendingDelete(editing)}
                >
                  Delete task
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                className="whitespace-nowrap"
                onClick={() => setTaskOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="whitespace-nowrap"
                loading={taskSaving}
                loadingText="Saving..."
              >
                {editing ? "Save changes" : "Create task"}
              </Button>
            </div>
          </div>
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
        />
      )}
      {projectsOpen && (
        <ProjectsModal
          open={projectsOpen}
          setOpen={setProjectsOpen}
          data={data}
          setData={setData}
          demoMode={demoMode}
        />
      )}
      <TeamSettingsModal
        open={settingsOpen}
        setOpen={setSettingsOpen}
        data={data}
        setData={setData}
        demoMode={demoMode}
      />
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

function TeamSettingsModal({
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
  const [tab, setTab] = useState<"statuses" | "team">("statuses");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ee1a25");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [teamMessage, setTeamMessage] = useState("");
  const [teamMessageIsError, setTeamMessageIsError] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<
    WorkspaceData["profiles"][number] | null
  >(null);
  const [statusToRename, setStatusToRename] = useState<
    WorkspaceData["statuses"][number] | null
  >(null);
  const [statusToDelete, setStatusToDelete] = useState<
    WorkspaceData["statuses"][number] | null
  >(null);
  const [settingActionPending, setSettingActionPending] = useState(false);
  async function add() {
    if (!name.trim()) return;
    if (tab === "statuses") {
      const item = {
        id: crypto.randomUUID(),
        name: name.trim(),
        color,
        sort_order: data.statuses.length,
        is_default: false,
      };
      if (!demoMode) {
        const { data: saved } = await createClient()
          .from("statuses")
          .insert(item)
          .select()
          .single();
        if (saved) item.id = saved.id;
      }
      setData((current) => ({
        ...current,
        statuses: [...current.statuses, item],
      }));
    }
    setName("");
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inviting) return;
    setInviting(true);
    setTeamMessage("");
    setTeamMessageIsError(false);
    try {
      if (demoMode) {
        setData((current) => ({
          ...current,
          profiles: [
            ...current.profiles,
            {
              id: crypto.randomUUID(),
              full_name: inviteName.trim() || inviteEmail.split("@")[0],
              avatar_url: null,
            },
          ],
        }));
        setTeamMessage("Demo teammate added.");
      } else {
        const response = await fetch("/api/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail, fullName: inviteName }),
        });
        const result = (await response.json()) as { error?: string };
        setTeamMessageIsError(!response.ok || Boolean(result.error));
        setTeamMessage(result.error ?? "Invitation sent.");
      }
      setInviteEmail("");
      setInviteName("");
    } catch {
      setTeamMessageIsError(true);
      setTeamMessage("The invitation could not be sent.");
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(userId: string) {
    setSettingActionPending(true);
    setTeamMessage("");
    setTeamMessageIsError(false);
    try {
      if (!demoMode) {
        const response = await fetch("/api/team", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const result = (await response.json()) as { error?: string };
        if (result.error) {
          setTeamMessageIsError(true);
          setTeamMessage(result.error);
          return;
        }
      }
      setData((current) => ({
        ...current,
        profiles: current.profiles.filter((person) => person.id !== userId),
      }));
      setMemberToRemove(null);
      setTeamMessage("Teammate removed.");
    } finally {
      setSettingActionPending(false);
    }
  }

  async function renameSetting(
    id: string,
    currentName: string,
    nextName: string,
  ) {
    if (!nextName || nextName === currentName) return;
    setSettingActionPending(true);
    try {
      if (!demoMode) {
        const { error } = await createClient()
          .from("statuses")
          .update({ name: nextName })
          .eq("id", id);
        if (error) {
          toast.error(error.message);
          return;
        }
      }
      setData((current) => ({
        ...current,
        statuses: current.statuses.map((item) =>
          item.id === id ? { ...item, name: nextName } : item,
        ),
      }));
      setStatusToRename(null);
      toast.success(`${nextName} updated.`);
    } finally {
      setSettingActionPending(false);
    }
  }

  async function deleteSetting(id: string) {
    setSettingActionPending(true);
    try {
      const result = demoMode
        ? null
        : await createClient().from("statuses").delete().eq("id", id);
      if (result?.error) {
        toast.error(result.error.message);
        return;
      }
      setData((current) => ({
        ...current,
        statuses: current.statuses.filter((item) => item.id !== id),
      }));
      setStatusToDelete(null);
      toast.success("Status deleted.");
    } finally {
      setSettingActionPending(false);
    }
  }

  async function moveStatus(id: string, direction: -1 | 1) {
    const ordered = [...data.statuses].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const index = ordered.findIndex((item) => item.id === id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return;
    [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];
    const next = ordered.map((item, sort_order) => ({ ...item, sort_order }));
    setData((current) => ({ ...current, statuses: next }));
    if (!demoMode) {
      const supabase = createClient();
      await Promise.all(
        next.map((item) =>
          supabase
            .from("statuses")
            .update({ sort_order: item.sort_order })
            .eq("id", item.id),
        ),
      );
    }
  }
  return (
    <>
      <Modal
        open={open}
        setIsOpen={setOpen}
        title="Team settings"
        hideActions
        size="lg"
        maxHeight="min(42rem, calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom))))"
      >
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {(["statuses", "team"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`view-button capitalize ${tab === item ? "view-button-active" : ""}`}
            >
              {item === "team" ? <FiUsers /> : <FiCheck />}
              {item}
            </button>
          ))}
        </div>
        {tab === "team" ? (
          <div className="space-y-3">
            {data.profiles.map((person) => (
              <div
                key={person.id}
                className="flex items-center gap-3 rounded-xl border border-black/10 p-3 dark:border-white/10"
              >
                <Avatar name={profileName(person)} />
                <div className="flex-1">
                  <p className="font-semibold">{profileName(person)}</p>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    Team member
                  </p>
                </div>
                {person.id !== data.currentProfile.id && (
                  <IconButton
                    label={`Remove ${profileName(person)}`}
                    onClick={() => setMemberToRemove(person)}
                  >
                    <FiTrash2 />
                  </IconButton>
                )}
              </div>
            ))}
            <form
              className="mt-5 grid gap-3 border-t border-black/10 pt-5 dark:border-white/10 sm:grid-cols-2"
              onSubmit={inviteMember}
            >
              <Input
                label="Name"
                name="invite-name"
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
                placeholder="New Ryan"
              />
              <Input
                label="Email"
                name="invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="ryan@example.com"
              />
              {teamMessageIsError ? (
                <ErrorCallout className="sm:col-span-2">
                  {teamMessage}
                </ErrorCallout>
              ) : teamMessage ? (
                <SuccessCallout className="sm:col-span-2">
                  {teamMessage}
                </SuccessCallout>
              ) : null}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  disabled={inviting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={inviting}
                  loadingText="Inviting..."
                >
                  Invite teammate
                </Button>
              </div>
            </form>
          </div>
        ) : (
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
                    <span className="flex-1 font-semibold">{item.name}</span>
                    {"is_default" in item && item.is_default && (
                      <Pill size="sm">Default</Pill>
                    )}
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
                      label={`Rename ${item.name}`}
                      onClick={() => setStatusToRename(item)}
                    >
                      <FiMoreHorizontal />
                    </IconButton>
                    <IconButton
                      label={`Delete ${item.name}`}
                      onClick={() => setStatusToDelete(item)}
                    >
                      <FiTrash2 />
                    </IconButton>
                  </div>
                ))}
            </div>
            <div className="mt-5 grid gap-3 border-t border-black/10 pt-5 dark:border-white/10 sm:grid-cols-[1fr_auto]">
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
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void add()}>Add</Button>
              </div>
            </div>
          </>
        )}
      </Modal>
      <ConfirmationDialog
        open={Boolean(memberToRemove)}
        setOpen={(nextOpen) => {
          if (!nextOpen) setMemberToRemove(null);
        }}
        title="Remove teammate?"
        description={`Remove ${memberToRemove ? profileName(memberToRemove) : "this teammate"} and revoke their access?`}
        confirmLabel="Remove teammate"
        pendingLabel="Removing..."
        pending={settingActionPending}
        destructive
        onConfirm={() => {
          if (memberToRemove) void removeMember(memberToRemove.id);
        }}
      />
      <PromptDialog
        open={Boolean(statusToRename)}
        setOpen={(nextOpen) => {
          if (!nextOpen) setStatusToRename(null);
        }}
        title="Rename status"
        label="Status name"
        initialValue={statusToRename?.name}
        pending={settingActionPending}
        onConfirm={(nextName) => {
          if (statusToRename)
            void renameSetting(
              statusToRename.id,
              statusToRename.name,
              nextName,
            );
        }}
      />
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
