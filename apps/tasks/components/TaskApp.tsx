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
  EmptyState,
  Heading,
  IconButton,
  Input,
  Modal,
  Pill,
  Select,
  Textarea,
} from "@ryanmeetup/ui";
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiFilter,
  FiGrid,
  FiList,
  FiLogOut,
  FiMenu,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiSettings,
  FiTrash2,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import type { Priority, Task, WorkspaceData } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

type View = "board" | "list";
type Draft = Pick<
  Task,
  | "title"
  | "description"
  | "status_id"
  | "work_group_id"
  | "assignee_id"
  | "start_date"
  | "due_date"
  | "priority"
>;
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
    work_group_id: null,
    assignee_id: null,
    start_date: null,
    due_date: null,
    priority: "medium",
  };
}

function initials(name: string) {
  return name
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

function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span
      title={name}
      className={`inline-grid shrink-0 place-items-center rounded-full border border-black/10 bg-black text-[9px] font-bold text-white dark:border-white/20 dark:bg-white dark:text-black ${small ? "h-6 w-6" : "h-8 w-8"}`}
    >
      {initials(name)}
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
  const [view, setView] = useState<View>("board");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [draft, setDraft] = useState<Draft>(
    blankDraft(
      initialData.statuses[1]?.id ?? initialData.statuses[0]?.id ?? "",
    ),
  );
  const [search, setSearch] = useState("");
  const [assignee, setAssignee] = useState("all");
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState("updated");

  useEffect(() => {
    if (!demoMode) return;
    const saved = localStorage.getItem("ryanmeetup.tasks.workspace");
    if (saved) {
      try {
        const restored = JSON.parse(saved) as WorkspaceData;
        queueMicrotask(() => setData(restored));
      } catch {
        localStorage.removeItem("ryanmeetup.tasks.workspace");
      }
    }
  }, [demoMode]);

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
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [demoMode]);

  const profiles = useMemo(
    () => new Map(data.profiles.map((item) => [item.id, item])),
    [data.profiles],
  );
  const groups = useMemo(
    () => new Map(data.workGroups.map((item) => [item.id, item])),
    [data.workGroups],
  );
  const statuses = useMemo(
    () => [...data.statuses].sort((a, b) => a.sort_order - b.sort_order),
    [data.statuses],
  );
  const visibleTasks = useMemo(
    () =>
      data.tasks
        .filter((task) => {
          const needle = search.toLowerCase();
          return (
            (!needle ||
              `${task.title} ${task.description ?? ""}`
                .toLowerCase()
                .includes(needle)) &&
            (assignee === "all" ||
              (assignee === "unassigned"
                ? !task.assignee_id
                : task.assignee_id === assignee)) &&
            (group === "all" || task.work_group_id === group) &&
            (status === "all" || task.status_id === status) &&
            (priority === "all" || task.priority === priority)
          );
        })
        .sort((a, b) =>
          sort === "due"
            ? (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999")
            : sort === "priority"
              ? priorities.indexOf(b.priority) - priorities.indexOf(a.priority)
              : b.updated_at.localeCompare(a.updated_at),
        ),
    [assignee, data.tasks, group, priority, search, sort, status],
  );

  function openCreate(statusId?: string) {
    setEditing(null);
    setDraft(blankDraft(statusId ?? statuses[1]?.id ?? statuses[0]?.id ?? ""));
    setTaskOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setDraft({
      title: task.title,
      description: task.description,
      status_id: task.status_id,
      work_group_id: task.work_group_id,
      assignee_id: task.assignee_id,
      start_date: task.start_date,
      due_date: task.due_date,
      priority: task.priority,
    });
    setTaskOpen(true);
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const now = new Date().toISOString();
    if (demoMode) {
      const task: Task = editing
        ? { ...editing, ...draft, title: draft.title.trim(), updated_at: now }
        : {
            ...draft,
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
      }));
    } else {
      const supabase = createClient();
      if (editing)
        await supabase
          .from("tasks")
          .update({ ...draft, title: draft.title.trim() })
          .eq("id", editing.id);
      else
        await supabase.from("tasks").insert({
          ...draft,
          title: draft.title.trim(),
          created_by: data.currentProfile.id,
        });
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .order("updated_at", { ascending: false });
      if (tasks) setData((current) => ({ ...current, tasks }));
    }
    setTaskOpen(false);
  }

  async function removeTask(id: string) {
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    if (!demoMode) await createClient().from("tasks").delete().eq("id", id);
    setData((current) => ({
      ...current,
      tasks: current.tasks.filter((item) => item.id !== id),
    }));
    setTaskOpen(false);
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

  const filterCount = [assignee, group, status, priority].filter(
    (value) => value !== "all",
  ).length;
  const taskCard = (task: Task) => {
    const taskGroup = task.work_group_id
      ? groups.get(task.work_group_id)
      : null;
    const person = task.assignee_id ? profiles.get(task.assignee_id) : null;
    return (
      <button
        draggable
        onDragStart={(event) =>
          event.dataTransfer.setData("text/task-id", task.id)
        }
        onClick={() => openEdit(task)}
        key={task.id}
        className="group w-full rounded-xl border border-black/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-white/30"
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
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0 space-y-2">
            {taskGroup && (
              <span className="flex items-center gap-1.5 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-black/60 dark:text-white/60">
                <i
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: taskGroup.color }}
                />
                {taskGroup.name}
              </span>
            )}
            {task.due_date && (
              <span className="flex items-center gap-1.5 text-[11px] text-black/55 dark:text-white/55">
                <FiCalendar />
                {displayDate(task.due_date)}
              </span>
            )}
          </div>
          {person ? (
            <Avatar name={person.full_name} small />
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
            <p className="font-cooper text-xl">Ryan Meetup</p>
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
          <button disabled className="sidebar-link opacity-40">
            <FiCalendar />
            Calendar
            <Pill size="sm" className="ml-auto">
              Soon
            </Pill>
          </button>
        </nav>
        <div className="mt-8">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45 dark:text-white/45">
            Work groups
          </p>
          <div className="mt-2 space-y-1">
            {data.workGroups.map((item) => (
              <button
                key={item.id}
                onClick={() => setGroup(group === item.id ? "all" : item.id)}
                className={`sidebar-link ${group === item.id ? "sidebar-link-active" : ""}`}
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
        <div className="mt-auto space-y-2 border-t border-black/10 pt-4 dark:border-white/10">
          {data.currentProfile.role === "admin" && (
            <button
              className="sidebar-link"
              onClick={() => setSettingsOpen(true)}
            >
              <FiSettings />
              Team settings
            </button>
          )}
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={data.currentProfile.full_name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {data.currentProfile.full_name}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-black/45 dark:text-white/45">
                {data.currentProfile.role}
                {demoMode ? " · Demo" : ""}
              </p>
            </div>
            {!demoMode && (
              <IconButton
                label="Sign out"
                onClick={async () => {
                  await createClient().auth.signOut();
                  location.assign("/login");
                }}
              >
                <FiLogOut />
              </IconButton>
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
          <ThemeToggle />
          <Button size="sm" leftIcon={<FiPlus />} onClick={() => openCreate()}>
            New task
          </Button>
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
                Team workspace
              </p>
              <Heading size="h1" className="text-3xl sm:text-4xl">
                {view === "board" ? "The big board" : "Every task"}
              </Heading>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                {visibleTasks.length}{" "}
                {visibleTasks.length === 1 ? "task" : "tasks"} in view. Keep the
                good work moving.
              </p>
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
              <Select
                variant="compact"
                label="Assignee"
                name="assignee-filter"
                value={assignee}
                onChange={setAssignee}
                options={[
                  { label: "Anyone", value: "all" },
                  { label: "Unassigned", value: "unassigned" },
                  ...data.profiles.map((item) => ({
                    label: item.full_name,
                    value: item.id,
                  })),
                ]}
              />
              <Select
                variant="compact"
                label="Group"
                name="group-filter"
                value={group}
                onChange={setGroup}
                options={[
                  { label: "All groups", value: "all" },
                  ...data.workGroups.map((item) => ({
                    label: item.name,
                    value: item.id,
                  })),
                ]}
              />
              <Select
                variant="compact"
                label="Status"
                name="status-filter"
                value={status}
                onChange={setStatus}
                options={[
                  { label: "All statuses", value: "all" },
                  ...statuses.map((item) => ({
                    label: item.name,
                    value: item.id,
                  })),
                ]}
              />
              <Select
                variant="compact"
                label="Priority"
                name="priority-filter"
                value={priority}
                onChange={setPriority}
                options={[
                  { label: "All priorities", value: "all" },
                  ...priorities.map((item) => ({
                    label: item[0].toUpperCase() + item.slice(1),
                    value: item,
                  })),
                ]}
              />
              {filterCount > 0 && (
                <button
                  className="shrink-0 text-xs font-semibold text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
                  onClick={() => {
                    setAssignee("all");
                    setGroup("all");
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
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      void moveTask(
                        event.dataTransfer.getData("text/task-id"),
                        item.id,
                      );
                    }}
                    className="min-h-[420px] rounded-2xl bg-black/[0.035] p-3 dark:bg-white/[0.035]"
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
                      <th>Group</th>
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
                      const taskGroup = task.work_group_id
                        ? groups.get(task.work_group_id)
                        : null;
                      const person = task.assignee_id
                        ? profiles.get(task.assignee_id)
                        : null;
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
                          <td>{taskGroup?.name ?? "—"}</td>
                          <td>
                            {person ? (
                              <span className="flex items-center gap-2">
                                <Avatar name={person.full_name} small />
                                {person.full_name}
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
                  </tbody>
                </table>
                {visibleTasks.length === 0 && (
                  <EmptyState message="No tasks found. Try clearing a filter or add the first task in this view." />
                )}
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
        panelClassName="max-h-[92vh] max-w-2xl overflow-y-auto"
      >
        <form className="space-y-5" onSubmit={saveTask}>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Status"
              name="task-status"
              value={draft.status_id}
              onChange={(value) => setDraft({ ...draft, status_id: value })}
              options={statuses.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
            />
            <Select
              label="Priority"
              name="task-priority"
              value={draft.priority}
              onChange={(value) =>
                setDraft({ ...draft, priority: value as Priority })
              }
              options={priorities.map((item) => ({
                label: item[0].toUpperCase() + item.slice(1),
                value: item,
              }))}
            />
            <Select
              label="Work group"
              name="task-group"
              value={draft.work_group_id ?? ""}
              onChange={(value) =>
                setDraft({ ...draft, work_group_id: value || null })
              }
              options={[
                { label: "No work group", value: "" },
                ...data.workGroups.map((item) => ({
                  label: item.name,
                  value: item.id,
                })),
              ]}
            />
            <Select
              label="Assignee"
              name="task-assignee"
              value={draft.assignee_id ?? ""}
              onChange={(value) =>
                setDraft({ ...draft, assignee_id: value || null })
              }
              options={[
                { label: "Unassigned", value: "" },
                ...data.profiles.map((item) => ({
                  label: item.full_name,
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
                  setDraft({ ...draft, start_date: event.target.value || null })
                }
              />
            </label>
            <label className="date-field">
              <span>Due date</span>
              <input
                type="date"
                value={draft.due_date ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, due_date: event.target.value || null })
                }
              />
            </label>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-black/10 pt-5 dark:border-white/10 sm:flex-row sm:justify-between">
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                className="text-red-600 dark:text-red-400"
                leftIcon={<FiTrash2 />}
                onClick={() => void removeTask(editing.id)}
              >
                Delete task
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTaskOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" leftIcon={<FiCheck />}>
                {editing ? "Save changes" : "Create task"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
      <AdminModal
        open={settingsOpen}
        setOpen={setSettingsOpen}
        data={data}
        setData={setData}
        demoMode={demoMode}
      />
    </div>
  );
}

function AdminModal({
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
  const [tab, setTab] = useState<"groups" | "statuses" | "team">("groups");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ee1a25");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [teamMessage, setTeamMessage] = useState("");
  async function add() {
    if (!name.trim()) return;
    if (tab === "groups") {
      const item = {
        id: crypto.randomUUID(),
        name: name.trim(),
        color,
        created_by: data.currentProfile.id,
      };
      if (!demoMode) {
        const { data: saved } = await createClient()
          .from("work_groups")
          .insert(item)
          .select()
          .single();
        if (saved) item.id = saved.id;
      }
      setData((current) => ({
        ...current,
        workGroups: [...current.workGroups, item],
      }));
    } else if (tab === "statuses") {
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
    setTeamMessage("");
    if (demoMode) {
      setData((current) => ({
        ...current,
        profiles: [
          ...current.profiles,
          {
            id: crypto.randomUUID(),
            full_name: inviteName.trim() || inviteEmail.split("@")[0],
            avatar_url: null,
            role: "member",
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
      setTeamMessage(result.error ?? "Invitation sent.");
    }
    setInviteEmail("");
    setInviteName("");
  }

  async function removeMember(userId: string) {
    if (!window.confirm("Remove this teammate and revoke their access?"))
      return;
    setTeamMessage("");
    if (!demoMode) {
      const response = await fetch("/api/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const result = (await response.json()) as { error?: string };
      if (result.error) {
        setTeamMessage(result.error);
        return;
      }
    }
    setData((current) => ({
      ...current,
      profiles: current.profiles.filter((person) => person.id !== userId),
    }));
    setTeamMessage("Teammate removed.");
  }

  async function renameSetting(id: string, currentName: string) {
    const nextName = window.prompt("Update the name", currentName)?.trim();
    if (!nextName || nextName === currentName) return;
    const table = tab === "groups" ? "work_groups" : "statuses";
    if (!demoMode)
      await createClient().from(table).update({ name: nextName }).eq("id", id);
    setData((current) =>
      tab === "groups"
        ? {
            ...current,
            workGroups: current.workGroups.map((item) =>
              item.id === id ? { ...item, name: nextName } : item,
            ),
          }
        : {
            ...current,
            statuses: current.statuses.map((item) =>
              item.id === id ? { ...item, name: nextName } : item,
            ),
          },
    );
  }

  async function deleteSetting(id: string, isDefault = false) {
    const warning = isDefault
      ? "This is a default status. Delete it anyway? Tasks using it must be moved first."
      : "Delete this shared setting?";
    if (!window.confirm(warning)) return;
    const table = tab === "groups" ? "work_groups" : "statuses";
    const result = demoMode
      ? null
      : await createClient().from(table).delete().eq("id", id);
    if (result?.error) {
      window.alert(result.error.message);
      return;
    }
    setData((current) =>
      tab === "groups"
        ? {
            ...current,
            workGroups: current.workGroups.filter((item) => item.id !== id),
            tasks: current.tasks.map((task) =>
              task.work_group_id === id
                ? { ...task, work_group_id: null }
                : task,
            ),
          }
        : {
            ...current,
            statuses: current.statuses.filter((item) => item.id !== id),
          },
    );
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
    <Modal
      open={open}
      setIsOpen={setOpen}
      title="Team settings"
      hideActions
      panelClassName="max-w-2xl"
    >
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {(["groups", "statuses", "team"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`view-button capitalize ${tab === item ? "view-button-active" : ""}`}
          >
            {item === "team" ? (
              <FiUsers />
            ) : item === "statuses" ? (
              <FiCheck />
            ) : (
              <FiGrid />
            )}
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
              <Avatar name={person.full_name} />
              <div className="flex-1">
                <p className="font-semibold">{person.full_name}</p>
                <p className="text-xs capitalize text-black/50 dark:text-white/50">
                  {person.role}
                </p>
              </div>
              {person.id !== data.currentProfile.id && (
                <IconButton
                  label={`Remove ${person.full_name}`}
                  onClick={() => void removeMember(person.id)}
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
            {teamMessage && (
              <p
                role="status"
                className="text-sm text-black/60 dark:text-white/60"
              >
                {teamMessage}
              </p>
            )}
            <Button
              type="submit"
              className="sm:col-start-2"
              leftIcon={<FiPlus />}
            >
              Invite teammate
            </Button>
          </form>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {(tab === "groups"
              ? data.workGroups
              : [...data.statuses].sort((a, b) => a.sort_order - b.sort_order)
            ).map((item) => (
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
                {tab === "statuses" && (
                  <>
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
                  </>
                )}
                <IconButton
                  label={`Rename ${item.name}`}
                  onClick={() => void renameSetting(item.id, item.name)}
                >
                  <FiMoreHorizontal />
                </IconButton>
                <IconButton
                  label={`Delete ${item.name}`}
                  onClick={() =>
                    void deleteSetting(
                      item.id,
                      "is_default" in item && item.is_default,
                    )
                  }
                >
                  <FiTrash2 />
                </IconButton>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 border-t border-black/10 pt-5 dark:border-white/10 sm:grid-cols-[1fr_auto_auto]">
            <Input
              label={`New ${tab === "groups" ? "work group" : "status"}`}
              name="setting-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name"
            />
            <label className="date-field">
              <span>Color</span>
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
              />
            </label>
            <Button
              className="self-end"
              onClick={() => void add()}
              leftIcon={<FiPlus />}
            >
              Add
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
