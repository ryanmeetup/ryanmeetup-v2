"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Avatar,
  Button,
  Card,
  ConfirmationDialog,
  EmptyState,
  Heading,
  IconButton,
} from "@ryanmeetup/ui";
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiFileText,
  FiMenu,
  FiPlus,
  FiSend,
  FiTrash2,
} from "react-icons/fi";
import { CategoriesModal } from "@/components/categories";
import { TaskBanners } from "@/components/global";
import {
  TaskHeaderActions,
  TaskSearch,
  TasksSidebar,
} from "@/components/navigation";
import { ProjectsModal } from "@/components/projects";
import { NewTaskModal } from "@/components/tasks/NewTaskModal";
import { withAccessPreview } from "@/lib/access-preview";
import {
  deleteTaskDraft,
  readTaskDrafts,
  taskDraftsChangedEvent,
  type StoredTaskDraft,
} from "@/lib/task-drafts";
import type { Status, Task, TaskActivity, WorkspaceData } from "@/lib/types";
import { taskPath } from "@/lib/task-key";
import { TaskKeyBadge } from "@/components/tasks/TaskKeyBadge";

const dayMs = 24 * 60 * 60 * 1000;
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function profileName(profile?: WorkspaceData["profiles"][number]) {
  return profile?.full_name || "Teammate";
}

function StatusBadge({ status }: { status?: Status }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-black/65 dark:text-white/65">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: status?.color ?? "#999" }}
      />
      {status?.name ?? "Unknown"}
    </span>
  );
}

function DashboardTaskList({
  data,
  empty,
  tasks,
}: {
  data: WorkspaceData;
  empty: string;
  tasks: Task[];
}) {
  const statuses = new Map(data.statuses.map((status) => [status.id, status]));
  const profiles = new Map(
    data.profiles.map((profile) => [profile.id, profile]),
  );
  return tasks.length ? (
    <ul className="divide-y divide-black/10 dark:divide-white/10">
      {tasks.map((task) => {
        const assignee = task.assignee_id
          ? profiles.get(task.assignee_id)
          : undefined;
        return (
          <li key={task.id}>
            <Link
              href={withAccessPreview(taskPath(task), data.accessPreview)}
              className="group grid gap-3 px-4 py-4 transition hover:bg-black/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 dark:hover:bg-white/[0.035] dark:focus-visible:ring-white/40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <span className="min-w-0">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="min-w-0 text-sm font-semibold group-hover:underline">
                    {task.title}
                  </span>
                  <TaskKeyBadge task={task} />
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusBadge status={statuses.get(task.status_id)} />
                  <span className="inline-flex items-center gap-1.5 text-xs text-black/55 dark:text-white/55">
                    <Avatar
                      name={assignee ? profileName(assignee) : "Unassigned"}
                      src={assignee?.avatar_url}
                      size="sm"
                    />
                    {assignee ? profileName(assignee) : "Unassigned"}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs font-medium text-black/50 dark:text-white/50">
                {task.due_date
                  ? dateFormatter.format(new Date(`${task.due_date}T12:00:00`))
                  : "No due date"}
                <FiArrowRight className="transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  ) : (
    <EmptyState variant="plain" message={empty} />
  );
}

function SectionCard({
  action,
  children,
  icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Card size="none" className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
        <span className="text-black/50 dark:text-white/50">{icon}</span>
        <h2 className="font-semibold">{title}</h2>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </Card>
  );
}

function statusChangeDescription(item: TaskActivity, statuses: Status[]) {
  const fromId =
    typeof item.details.from_status_id === "string"
      ? item.details.from_status_id
      : null;
  const toId =
    typeof item.details.status_id === "string" ? item.details.status_id : null;
  return {
    from: statuses.find((status) => status.id === fromId),
    to: statuses.find((status) => status.id === toId),
  };
}

export function DashboardPageClient({
  initialData,
  demoMode,
}: {
  initialData: WorkspaceData;
  demoMode: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectCreateOpen, setProjectCreateOpen] = useState(false);
  const [categoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [drafts, setDrafts] = useState<StoredTaskDraft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<StoredTaskDraft | null>(
    null,
  );
  const [draftPendingDelete, setDraftPendingDelete] =
    useState<StoredTaskDraft | null>(null);
  const refreshDrafts = useCallback(() => {
    if (!data.accessPreview) {
      setDrafts(readTaskDrafts(data.currentProfile.id));
    }
  }, [data.accessPreview, data.currentProfile.id]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(refreshDrafts, 0);
    window.addEventListener(taskDraftsChangedEvent, refreshDrafts);
    window.addEventListener("storage", refreshDrafts);
    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener(taskDraftsChangedEvent, refreshDrafts);
      window.removeEventListener("storage", refreshDrafts);
    };
  }, [refreshDrafts]);
  const subjectId =
    data.accessPreview?.kind === "user"
      ? data.accessPreview.subjectId
      : data.currentProfile.id;
  const completedStatusIds = useMemo(
    () =>
      new Set(
        data.statuses
          .filter((status) => status.is_completed)
          .map((status) => status.id),
      ),
    [data.statuses],
  );
  const activeTasks = useMemo(
    () => data.tasks.filter((task) => !completedStatusIds.has(task.status_id)),
    [completedStatusIds, data.tasks],
  );
  const assignedToMe = useMemo(
    () => activeTasks.filter((task) => task.assignee_id === subjectId),
    [activeTasks, subjectId],
  );
  const reportedByMe = useMemo(
    () => activeTasks.filter((task) => task.reported_by === subjectId),
    [activeTasks, subjectId],
  );
  const upcoming = useMemo(() => {
    const now = new Date();
    const soon = new Date(now.getTime() + 14 * dayMs);
    return activeTasks
      .filter((task) => {
        if (!task.due_date) return false;
        const due = new Date(`${task.due_date}T23:59:59`);
        return (
          due >= now &&
          due <= soon &&
          task.assignee_id === subjectId
        );
      })
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  }, [activeTasks, subjectId]);
  const relevantTaskIds = useMemo(
    () => new Set([...assignedToMe, ...reportedByMe].map((task) => task.id)),
    [reportedByMe, assignedToMe],
  );
  const recentActivity = data.activity
    .filter((item) => relevantTaskIds.has(item.task_id))
    .slice(0, 8);
  const tasks = new Map(data.tasks.map((task) => [task.id, task]));
  const profiles = new Map(
    data.profiles.map((profile) => [profile.id, profile]),
  );
  const viewAllAssigned = withAccessPreview(
    `/board?assignee=${encodeURIComponent(subjectId)}`,
    data.accessPreview,
  );

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-black dark:bg-[#101010] dark:text-white">
      <TasksSidebar
        data={data}
        demoMode={demoMode}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onCreateCategory={() => setCategoryCreateOpen(true)}
        onCreateProject={() => setProjectCreateOpen(true)}
      />
      <main className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-black/10 bg-[#f7f7f5]/90 px-4 backdrop-blur-xl focus-within:z-[2147483647] dark:border-white/10 dark:bg-[#101010]/90 sm:px-6 lg:px-8">
          <IconButton
            label="Open navigation"
            tooltipTriggerClassName="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu />
          </IconButton>
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
            onNewTask={() => setNewTaskOpen(true)}
          />
        </header>
        <TaskBanners preview={data.accessPreview} />

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
                  Your work at a glance
                </p>
                <Heading size="h1" className="mt-2 text-4xl">
                  Dashboard
                </Heading>
                <p className="mt-2 text-sm text-black/65 dark:text-white/65">
                  Deadlines, delegated work, and the latest moves—without the
                  board spelunking.
                </p>
              </div>
              <Button
                type="button"
                leftIcon={<FiPlus />}
                onClick={() => setNewTaskOpen(true)}
              >
                New task
              </Button>
            </div>

            <div
              className={`grid gap-4 sm:grid-cols-2 ${data.accessPreview ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}
            >
              {[
                {
                  label: "Assigned to me",
                  value: assignedToMe.length,
                  icon: <FiCheckCircle />,
                  href: viewAllAssigned,
                },
                {
                  label: "Reported by me",
                  value: reportedByMe.length,
                  icon: <FiSend />,
                  href: withAccessPreview(
                    `/board?reporter=${encodeURIComponent(subjectId)}`,
                    data.accessPreview,
                  ),
                },
                {
                  label: "Due within 14 days",
                  value: upcoming.length,
                  icon: <FiCalendar />,
                  href: withAccessPreview(
                    `/board?dueWithin=14&assignee=${encodeURIComponent(subjectId)}`,
                    data.accessPreview,
                  ),
                },
                ...(!data.accessPreview
                  ? [
                      {
                        label: "Saved drafts",
                        value: drafts.length,
                        icon: <FiFileText />,
                        href: "#saved-drafts",
                      },
                    ]
                  : []),
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-label={`View ${item.label.toLowerCase()}`}
                  className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f5] dark:focus-visible:ring-white/50 dark:focus-visible:ring-offset-[#101010]"
                >
                  <Card
                    size="sm"
                    className="relative h-full cursor-pointer transition duration-200 group-hover:-translate-y-1 group-hover:border-black/30 group-hover:shadow-md motion-reduce:transform-none dark:group-hover:border-white/35"
                  >
                    <span className="flex items-center gap-2 pr-8 text-xs font-semibold uppercase tracking-[0.16em] text-black/50 dark:text-white/50">
                      {item.icon}
                      {item.label}
                    </span>
                    <p className="mt-3 font-cooper text-4xl">{item.value}</p>
                    <FiArrowRight
                      aria-hidden="true"
                      className="absolute right-4 top-4 text-black/35 transition group-hover:translate-x-1 group-hover:text-black/70 motion-reduce:transform-none dark:text-white/35 dark:group-hover:text-white/75"
                    />
                  </Card>
                </Link>
              ))}
            </div>

            {!data.accessPreview && (
              <div id="saved-drafts" className="scroll-mt-20">
                <SectionCard title="Drafts" icon={<FiFileText />}>
                  {drafts.length > 0 ? (
                    <ul className="divide-y divide-black/10 dark:divide-white/10">
                      {drafts.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {item.draft.title.trim() || "Untitled task"}
                            </span>
                            <span className="mt-1 block text-xs text-black/50 dark:text-white/50">
                              Saved {new Date(item.updatedAt).toLocaleString()}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<FiEdit2 />}
                              onClick={() => setSelectedDraft(item)}
                            >
                              Continue
                            </Button>
                            <IconButton
                              label={`Delete ${item.draft.title || "untitled draft"}`}
                              size="sm"
                              onClick={() => setDraftPendingDelete(item)}
                            >
                              <FiTrash2 />
                            </IconButton>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState
                      variant="plain"
                      message="No saved drafts right now."
                    />
                  )}
                </SectionCard>
              </div>
            )}

            <div className="grid items-start gap-6 xl:grid-cols-2">
              <SectionCard
                title="Assigned to me"
                icon={<FiCheckCircle />}
                action={
                  <Link
                    href={viewAllAssigned}
                    className="text-xs font-semibold hover:underline"
                  >
                    View all
                  </Link>
                }
              >
                <DashboardTaskList
                  data={data}
                  tasks={assignedToMe.slice(0, 6)}
                  empty="Nothing assigned to you right now."
                />
              </SectionCard>
              <SectionCard
                title="Reported by me"
                icon={<FiSend />}
                action={
                  <Link
                    href={withAccessPreview(
                      `/board?view=list&reporter=${encodeURIComponent(subjectId)}`,
                      data.accessPreview,
                    )}
                    className="text-xs font-semibold hover:underline"
                  >
                    View all
                  </Link>
                }
              >
                <DashboardTaskList
                  data={data}
                  tasks={reportedByMe.slice(0, 6)}
                  empty="You haven't reported any active tasks."
                />
              </SectionCard>
              <SectionCard title="Upcoming deadlines" icon={<FiCalendar />}>
                <DashboardTaskList
                  data={data}
                  tasks={upcoming.slice(0, 6)}
                  empty="No deadlines coming up in the next 14 days."
                />
              </SectionCard>
              <SectionCard
                title="Recent status changes"
                icon={<FiClock />}
                action={
                  <Link
                    href={withAccessPreview(
                      "/activity?events=moved",
                      data.accessPreview,
                    )}
                    className="text-xs font-semibold hover:underline"
                  >
                    All activity
                  </Link>
                }
              >
                {recentActivity.length ? (
                  <ul className="divide-y divide-black/10 dark:divide-white/10">
                    {recentActivity.map((item) => {
                      const task = tasks.get(item.task_id);
                      const actor = item.actor_id
                        ? profiles.get(item.actor_id)
                        : undefined;
                      const change = statusChangeDescription(
                        item,
                        data.statuses,
                      );
                      return (
                        <li key={item.id} className="px-4 py-4">
                          <Link
                            href={withAccessPreview(
                              task ? taskPath(task) : "/activity",
                              data.accessPreview,
                            )}
                            className="group block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/40"
                          >
                            <span className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="min-w-0 text-sm font-semibold group-hover:underline">
                                {task?.title ?? "Task"}
                              </span>
                              {task && <TaskKeyBadge task={task} />}
                            </span>
                            <span className="mt-2 flex flex-wrap items-center gap-2">
                              {change.from && (
                                <StatusBadge status={change.from} />
                              )}
                              <FiArrowRight
                                className="text-black/35 dark:text-white/35"
                                aria-label="moved to"
                              />
                              <StatusBadge status={change.to} />
                            </span>
                            <span className="mt-2 block text-xs text-black/50 dark:text-white/50">
                              {profileName(actor)} ·{" "}
                              {dateTimeFormatter.format(
                                new Date(item.created_at),
                              )}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState
                    variant="plain"
                    message="No recent status changes on your tasks."
                  />
                )}
              </SectionCard>
            </div>
          </div>
        </div>
      </main>
      <CategoriesModal
        open={categoryCreateOpen}
        setOpen={setCategoryCreateOpen}
        data={data}
        setData={setData}
        demoMode={demoMode}
      />
      <ProjectsModal
        open={projectCreateOpen}
        setOpen={setProjectCreateOpen}
        data={data}
        setData={setData}
        demoMode={demoMode}
      />
      {!data.accessPreview && (newTaskOpen || selectedDraft) && (
        <NewTaskModal
          data={data}
          demoMode={demoMode}
          open
          setData={setData}
          setOpen={(open) => {
            if (!open) {
              setNewTaskOpen(false);
              setSelectedDraft(null);
              refreshDrafts();
            }
          }}
          initialDraft={selectedDraft}
        />
      )}
      <ConfirmationDialog
        open={Boolean(draftPendingDelete)}
        setOpen={(open) => {
          if (!open) setDraftPendingDelete(null);
        }}
        title="Delete draft?"
        description={
          draftPendingDelete
            ? `Delete “${draftPendingDelete.draft.title.trim() || "Untitled task"}”? This saved draft cannot be recovered.`
            : ""
        }
        confirmLabel="Delete draft"
        destructive
        onConfirm={() => {
          if (!draftPendingDelete) return;
          deleteTaskDraft(data.currentProfile.id, draftPendingDelete.id);
          setDraftPendingDelete(null);
        }}
      />
    </div>
  );
}
