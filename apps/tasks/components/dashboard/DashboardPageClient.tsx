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
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiFileText,
  FiMenu,
  FiPlus,
  FiSend,
  FiStar,
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
const widgetPageSize = 5;
const boundedWidgetPage = (page: number, total: number) =>
  Math.min(page, Math.max(0, Math.ceil(total / widgetPageSize) - 1));
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
  tone = "neutral",
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  icon: ReactNode;
  tone?: "blue" | "gold" | "green" | "neutral" | "violet";
  title: string;
}) {
  const toneStyles = {
    blue: "bg-blue-500/10 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200",
    gold: "bg-amber-500/12 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
    green:
      "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200",
    neutral: "bg-black/5 text-black/55 dark:bg-white/10 dark:text-white/60",
    violet:
      "bg-violet-500/10 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200",
  };

  return (
    <Card
      size="none"
      className="overflow-hidden bg-white/90 shadow-[0_12px_35px_rgba(0,0,0,0.045)] dark:bg-white/[0.055] dark:shadow-none"
    >
      <div className="flex items-center gap-3 border-b border-black/[0.07] px-4 py-3.5 dark:border-white/10">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${toneStyles[tone]}`}
        >
          {icon}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </Card>
  );
}

function WidgetPagination({
  label,
  onPageChange,
  page,
  total,
}: {
  label: string;
  onPageChange: (page: number) => void;
  page: number;
  total: number;
}) {
  if (total === 0) return null;

  const pageCount = Math.ceil(total / widgetPageSize);
  const start = page * widgetPageSize + 1;
  const end = Math.min(start + widgetPageSize - 1, total);

  return (
    <div className="flex items-center gap-3 border-t border-black/[0.07] px-4 py-3 dark:border-white/10">
      <p className="mr-auto text-xs font-medium text-black/55 dark:text-white/55">
        Showing {start}–{end} of {total}
      </p>
      <IconButton
        label={`Previous page of ${label}`}
        size="sm"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        <FiChevronLeft />
      </IconButton>
      <IconButton
        label={`Next page of ${label}`}
        size="sm"
        disabled={page >= pageCount - 1}
        onClick={() => onPageChange(page + 1)}
      >
        <FiChevronRight />
      </IconButton>
    </div>
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
  const [assignedPage, setAssignedPage] = useState(0);
  const [reportedPage, setReportedPage] = useState(0);
  const [upcomingPage, setUpcomingPage] = useState(0);
  const [activityPage, setActivityPage] = useState(0);
  const [draftPage, setDraftPage] = useState(0);
  const [favoriteProjectPage, setFavoriteProjectPage] = useState(0);
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
        return due >= now && due <= soon && task.assignee_id === subjectId;
      })
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  }, [activeTasks, subjectId]);
  const relevantTaskIds = useMemo(
    () => new Set([...assignedToMe, ...reportedByMe].map((task) => task.id)),
    [reportedByMe, assignedToMe],
  );
  const recentActivity = data.activity.filter((item) =>
    relevantTaskIds.has(item.task_id),
  );
  const favoriteProjects = data.projects.filter(
    (project) =>
      !project.archived_at &&
      (data.currentProfile.favorite_project_ids ?? []).includes(project.id),
  );
  const visibleAssignedPage = boundedWidgetPage(
    assignedPage,
    assignedToMe.length,
  );
  const visibleReportedPage = boundedWidgetPage(
    reportedPage,
    reportedByMe.length,
  );
  const visibleUpcomingPage = boundedWidgetPage(upcomingPage, upcoming.length);
  const visibleActivityPage = boundedWidgetPage(
    activityPage,
    recentActivity.length,
  );
  const visibleDraftPage = boundedWidgetPage(draftPage, drafts.length);
  const visibleFavoriteProjectPage = boundedWidgetPage(
    favoriteProjectPage,
    favoriteProjects.length,
  );
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

        <div className="relative overflow-hidden p-4 sm:p-6 lg:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 top-16 h-80 w-80 rounded-full bg-amber-300/15 blur-3xl dark:bg-amber-300/[0.06]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/3 top-80 h-96 w-96 rounded-full bg-blue-300/10 blur-3xl dark:bg-blue-400/[0.05]"
          />
          <div className="relative mx-auto max-w-7xl space-y-6">
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/90 px-5 py-6 text-black shadow-[0_12px_35px_rgba(0,0,0,0.045)] dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:shadow-none sm:px-7 sm:py-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
                    Your work at a glance
                  </p>
                  <Heading
                    size="h1"
                    bold
                    className="mt-2 max-w-2xl text-4xl sm:text-5xl"
                  >
                    RMT Dashboard
                  </Heading>
                  <p className="mt-3 max-w-xl text-sm text-black/65 dark:text-white/65">
                    Deadlines, delegated work, and the latest moves—without the
                    board spelunking.
                  </p>
                </div>
                <Button
                  type="button"
                  leftIcon={<FiPlus />}
                  onClick={() => setNewTaskOpen(true)}
                  className="shrink-0"
                >
                  New task
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
              ].map((item, index) => (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-label={`View ${item.label.toLowerCase()}`}
                  className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f5] dark:focus-visible:ring-white/50 dark:focus-visible:ring-offset-[#101010]"
                >
                  <Card
                    size="sm"
                    className={`relative h-full min-h-32 cursor-pointer overflow-hidden transition duration-200 group-hover:-translate-y-1 group-hover:border-black/25 group-hover:shadow-lg motion-reduce:transform-none dark:group-hover:border-white/35 ${
                      index === 0
                        ? "bg-blue-50/90 dark:bg-blue-400/10"
                        : index === 1
                          ? "bg-violet-50/90 dark:bg-violet-400/10"
                          : index === 2
                            ? "bg-amber-50/90 dark:bg-amber-400/10"
                            : "bg-emerald-50/90 dark:bg-emerald-400/10"
                    }`}
                  >
                    <span className="flex items-center gap-2 pr-8 text-xs font-semibold uppercase tracking-[0.16em] text-black/50 dark:text-white/50">
                      {item.icon}
                      {item.label}
                    </span>
                    <p className="mt-5 font-cooper text-5xl leading-none">
                      {item.value}
                    </p>
                    <span
                      aria-hidden
                      className="absolute -bottom-7 -right-5 text-[6rem] opacity-[0.045] transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 dark:opacity-[0.06]"
                    >
                      {item.icon}
                    </span>
                    <FiArrowRight
                      aria-hidden="true"
                      className="absolute right-4 top-4 text-black/35 transition group-hover:translate-x-1 group-hover:text-black/70 motion-reduce:transform-none dark:text-white/35 dark:group-hover:text-white/75"
                    />
                  </Card>
                </Link>
              ))}
            </div>

            <div className="gap-6 xl:columns-2">
              {!data.accessPreview && (
                <div
                  id="saved-drafts"
                  className="mb-6 break-inside-avoid scroll-mt-20"
                >
                  <SectionCard
                    title="Drafts"
                    icon={<FiFileText />}
                    tone="violet"
                  >
                    {drafts.length > 0 ? (
                      <ul className="divide-y divide-black/10 dark:divide-white/10">
                        {drafts
                          .slice(
                            visibleDraftPage * widgetPageSize,
                            (visibleDraftPage + 1) * widgetPageSize,
                          )
                          .map((item) => (
                            <li
                              key={item.id}
                              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold">
                                  {item.draft.title.trim() || "Untitled task"}
                                </span>
                                <span className="mt-1 block text-xs text-black/50 dark:text-white/50">
                                  Saved{" "}
                                  {new Date(item.updatedAt).toLocaleString()}
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
                    <WidgetPagination
                      label="drafts"
                      page={visibleDraftPage}
                      total={drafts.length}
                      onPageChange={setDraftPage}
                    />
                  </SectionCard>
                </div>
              )}

              <div className="mb-6 break-inside-avoid">
                <SectionCard
                  title="Assigned to me"
                  icon={<FiCheckCircle />}
                  tone="blue"
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
                    tasks={assignedToMe.slice(
                      visibleAssignedPage * widgetPageSize,
                      (visibleAssignedPage + 1) * widgetPageSize,
                    )}
                    empty="Nothing assigned to you right now."
                  />
                  <WidgetPagination
                    label="assigned tasks"
                    page={visibleAssignedPage}
                    total={assignedToMe.length}
                    onPageChange={setAssignedPage}
                  />
                </SectionCard>
              </div>

              {!data.accessPreview && (
                <div className="mb-6 break-inside-avoid">
                  <SectionCard
                    title="Favorite projects"
                    icon={<FiStar />}
                    tone="gold"
                    action={
                      <Link
                        href="/projects"
                        className="text-xs font-semibold hover:underline"
                      >
                        View all
                      </Link>
                    }
                  >
                    {favoriteProjects.length ? (
                      <ul className="divide-y divide-black/10 dark:divide-white/10">
                        {favoriteProjects
                          .slice(
                            visibleFavoriteProjectPage * widgetPageSize,
                            (visibleFavoriteProjectPage + 1) * widgetPageSize,
                          )
                          .map((project) => (
                            <li key={project.id}>
                              <Link
                                href={`/board?project=${encodeURIComponent(project.name)}`}
                                className="group flex items-center gap-3 px-4 py-4 transition hover:bg-black/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 dark:hover:bg-white/[0.035] dark:focus-visible:ring-white/40"
                              >
                                <FiStar
                                  className="shrink-0 text-amber-600 dark:text-amber-300"
                                  fill="currentColor"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold group-hover:underline">
                                    {project.name}
                                  </span>
                                  {project.description && (
                                    <span className="mt-1 block truncate text-xs text-black/55 dark:text-white/55">
                                      {project.description}
                                    </span>
                                  )}
                                </span>
                                <FiArrowRight className="shrink-0 text-black/35 transition-transform group-hover:translate-x-0.5 dark:text-white/35" />
                              </Link>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <EmptyState
                        variant="plain"
                        message="Favorite a project for quick access here."
                      />
                    )}
                    <WidgetPagination
                      label="favorite projects"
                      page={visibleFavoriteProjectPage}
                      total={favoriteProjects.length}
                      onPageChange={setFavoriteProjectPage}
                    />
                  </SectionCard>
                </div>
              )}

              <div className="mb-6 break-inside-avoid">
                <SectionCard
                  title="Upcoming deadlines"
                  icon={<FiCalendar />}
                  tone="gold"
                >
                  <DashboardTaskList
                    data={data}
                    tasks={upcoming.slice(
                      visibleUpcomingPage * widgetPageSize,
                      (visibleUpcomingPage + 1) * widgetPageSize,
                    )}
                    empty="No deadlines coming up in the next 14 days."
                  />
                  <WidgetPagination
                    label="upcoming deadlines"
                    page={visibleUpcomingPage}
                    total={upcoming.length}
                    onPageChange={setUpcomingPage}
                  />
                </SectionCard>
              </div>
              <div className="mb-6 break-inside-avoid">
                <SectionCard
                  title="Reported by me"
                  icon={<FiSend />}
                  tone="violet"
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
                    tasks={reportedByMe.slice(
                      visibleReportedPage * widgetPageSize,
                      (visibleReportedPage + 1) * widgetPageSize,
                    )}
                    empty="You haven't reported any active tasks."
                  />
                  <WidgetPagination
                    label="reported tasks"
                    page={visibleReportedPage}
                    total={reportedByMe.length}
                    onPageChange={setReportedPage}
                  />
                </SectionCard>
              </div>
              <div className="mb-6 break-inside-avoid">
                <SectionCard
                  title="Recent status changes"
                  icon={<FiClock />}
                  tone="green"
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
                      {recentActivity
                        .slice(
                          visibleActivityPage * widgetPageSize,
                          (visibleActivityPage + 1) * widgetPageSize,
                        )
                        .map((item) => {
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
                  <WidgetPagination
                    label="recent status changes"
                    page={visibleActivityPage}
                    total={recentActivity.length}
                    onPageChange={setActivityPage}
                  />
                </SectionCard>
              </div>
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
