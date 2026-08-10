"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Breadcrumbs,
  Button,
  Card,
  ConfirmationDialog,
  FormattedText,
  IconButton,
  toast,
} from "@ryanmeetup/ui";
import {
  FiActivity,
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiEdit3,
  FiFlag,
  FiFolder,
  FiLink,
  FiMenu,
  FiUser,
  FiUserCheck,
} from "react-icons/fi";
import { TaskBanners } from "@/components/global";
import {
  TaskHeaderActions,
  TaskSearch,
  TasksSidebar,
} from "@/components/navigation";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { withAccessPreview } from "@/lib/access-preview";
import {
  createTaskMutationService,
  type TaskDraft,
} from "@/lib/task-mutations";
import { taskKey, taskPath } from "@/lib/task-key";
import type { Task, WorkspaceData } from "@/lib/types";
import { TaskDetails } from "./TaskDetails";
import { TaskDueDate } from "./TaskDueDate";
import { TaskEditor } from "./TaskEditor";
import { TaskKeyBadge } from "./TaskKeyBadge";
import { emptyNewTaskDetails } from "./NewTaskDetails";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export function TaskPageClient({
  initialData,
  taskId,
  demoMode,
}: {
  initialData: WorkspaceData;
  taskId: string;
  demoMode: boolean;
}) {
  const { data, setData, getData } = useWorkspaceData(initialData, demoMode);
  const mutations = useMemo(
    () => createTaskMutationService({ demoMode, getData, setData }),
    [demoMode, getData, setData],
  );
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(true);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskMessage, setTaskMessage] = useState("");
  const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null);
  const [taskDeleting, setTaskDeleting] = useState(false);
  const conversationTopRef = useRef<HTMLDivElement>(null);
  const [conversationHeight, setConversationHeight] = useState<number>();
  const task =
    data.tasks.find((item) => item.id === taskId) ??
    initialData.tasks.find((item) => item.id === taskId)!;

  useEffect(() => {
    document.title = `${taskKey(task)}: ${task.title} | Ryan Meetup Tasks`;
  }, [task]);

  const status = data.statuses.find((item) => item.id === task.status_id);
  const project = data.projects.find((item) => item.id === task.project_id);
  const assignee = data.profiles.find((item) => item.id === task.assignee_id);
  const reporter = data.profiles.find((item) => item.id === task.reported_by);
  const categoryIds = new Set(
    data.taskCategories
      .filter((item) => item.task_id === task.id)
      .map((item) => item.category_id),
  );
  const categories = data.categories.filter((item) => categoryIds.has(item.id));
  const makeDraft = (): TaskDraft => ({
    title: task.title,
    description: task.description,
    status_id: task.status_id,
    project_id: task.project_id,
    category_ids: [...categoryIds],
    assignee_id: task.assignee_id,
    reported_by: task.reported_by,
    start_date: task.start_date,
    due_date: task.due_date,
    due_time: task.due_time,
    reminder_at: task.reminder_at,
    priority: task.priority,
  });
  const [draft, setDraft] = useState<TaskDraft>(makeDraft);

  useEffect(() => {
    function measureConversation() {
      const top = conversationTopRef.current?.getBoundingClientRect().top;
      if (top !== undefined) {
        setConversationHeight(Math.max(320, window.innerHeight - top - 32));
      }
    }
    measureConversation();
    window.addEventListener("resize", measureConversation);
    return () => window.removeEventListener("resize", measureConversation);
  }, []);

  function openEditor() {
    setDraft(makeDraft());
    setTaskMessage("");
    setTaskDetailsOpen(data.currentProfile.task_details_open_by_default);
    setTaskOpen(true);
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = !draft.title.trim()
      ? "A task title is required."
      : !draft.status_id
        ? "A status is required."
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
      const saved = await mutations.save(draft, task);
      mutations.applySaved(saved, true);
      setTaskOpen(false);
      toast.success("Task updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The task could not be saved.";
      setTaskMessage(message);
      toast.error(message);
    } finally {
      setTaskSaving(false);
    }
  }

  async function deleteTask() {
    setTaskDeleting(true);
    try {
      await mutations.remove(task.id);
      toast.success("Task deleted.");
      router.push("/");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The task could not be deleted.",
      );
    } finally {
      setTaskDeleting(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        new URL(taskPath(task!), window.location.origin).toString(),
      );
      toast.success(`${taskKey(task!)} link copied.`);
    } catch {
      toast.error("The task link could not be copied.");
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-black dark:bg-[#101010] dark:text-white">
      <TasksSidebar
        data={data}
        demoMode={demoMode}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onCreateCategory={() => undefined}
        onCreateProject={() => undefined}
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
          />
        </header>
        <TaskBanners preview={data.accessPreview} />

        <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <Breadcrumbs
                className="mb-2"
                variant="compact"
                crumbs={[
                  {
                    current: false,
                    href: withAccessPreview("/board", data.accessPreview),
                    icon: <FiArrowLeft aria-hidden />,
                    title: "Board",
                  },
                ]}
              />
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
                {task.title}
                <TaskKeyBadge
                  task={task}
                  size="title"
                  className="ml-3 align-middle"
                />
              </h1>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<FiLink />}
                onClick={copyLink}
              >
                Copy link
              </Button>
              <Button size="sm" leftIcon={<FiEdit3 />} onClick={openEditor}>
                Edit task
              </Button>
            </div>
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="space-y-6">
              <Card className="space-y-5">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black/55 dark:text-white/55">
                    Description
                  </h2>
                  {task.description ? (
                    <FormattedText
                      text={task.description}
                      className="mt-3 text-sm leading-7 text-black/75 dark:text-white/75"
                    />
                  ) : (
                    <p className="mt-3 text-sm text-black/50 dark:text-white/50">
                      No description yet.
                    </p>
                  )}
                </div>
                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <span
                        key={category.id}
                        className="inline-flex items-center gap-2 rounded-full border border-black/25 bg-black px-3 py-2 text-xs font-semibold text-white dark:border-white/30 dark:bg-white dark:text-black"
                      >
                        <i
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </span>
                    ))}
                  </div>
                )}
              </Card>

              <TaskDetails
                active
                pageLayout
                section="work"
                data={data}
                demoMode={demoMode}
                setData={setData}
                task={task}
              />
              <TaskDetails
                active
                pageLayout
                section="comment"
                data={data}
                demoMode={demoMode}
                setData={setData}
                task={task}
              />
            </div>

            <div className="space-y-6 xl:sticky xl:top-24">
              <Card className="space-y-5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black/55 dark:text-white/55">
                  Task details
                </h2>
                <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="flex items-center gap-1.5 text-black/50 dark:text-white/50">
                      <FiCalendar aria-hidden /> Created
                    </dt>
                    <dd className="mt-1 font-semibold">
                      {dateFormatter.format(new Date(task.created_at))}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-black/50 dark:text-white/50">
                      <FiClock aria-hidden /> Due
                    </dt>
                    <dd className="mt-1 font-semibold">
                      {task.due_date ? (
                        <TaskDueDate
                          dueDate={task.due_date}
                          isCompleted={status?.is_completed ?? false}
                          showIcon
                        />
                      ) : (
                        "No due date"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-black/50 dark:text-white/50">
                      <FiActivity aria-hidden /> Status
                    </dt>
                    <dd className="mt-1 flex items-center gap-2 font-semibold">
                      {status && (
                        <i
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                      )}
                      {status?.name ?? "Unknown"}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-black/50 dark:text-white/50">
                      <FiFlag aria-hidden /> Priority
                    </dt>
                    <dd className="mt-1 font-semibold capitalize">
                      {task.priority}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-black/50 dark:text-white/50">
                      <FiFolder aria-hidden /> Project
                    </dt>
                    <dd className="mt-1 font-semibold">
                      {project?.name ?? "No project"}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-black/50 dark:text-white/50">
                      <FiUserCheck aria-hidden /> Assignee
                    </dt>
                    <dd className="mt-1 flex items-center gap-2 font-semibold">
                      <Avatar
                        name={assignee?.full_name ?? "Unassigned"}
                        src={assignee?.avatar_url}
                        size="sm"
                      />
                      {assignee?.full_name ?? "Unassigned"}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-black/50 dark:text-white/50">
                      <FiUser aria-hidden /> Reported by
                    </dt>
                    <dd className="mt-1 flex items-center gap-2 font-semibold">
                      <Avatar
                        name={reporter?.full_name ?? "Unknown"}
                        src={reporter?.avatar_url}
                        size="sm"
                      />
                      {reporter?.full_name ?? "Unknown"}
                    </dd>
                  </div>
                </dl>
              </Card>

              <div
                ref={conversationTopRef}
                className="overflow-hidden rounded-2xl"
                style={
                  conversationHeight
                    ? { maxHeight: conversationHeight }
                    : undefined
                }
              >
                <TaskDetails
                  active
                  pageLayout
                  section="activity"
                  conversationHeight={conversationHeight}
                  data={data}
                  demoMode={demoMode}
                  setData={setData}
                  task={task}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <TaskEditor
        taskOpen={taskOpen}
        setTaskOpen={setTaskOpen}
        editing={task}
        taskDetailsOpen={taskDetailsOpen}
        setTaskDetailsOpen={setTaskDetailsOpen}
        createAnother={false}
        setCreateAnother={() => undefined}
        taskSaving={taskSaving}
        draft={draft}
        setDraft={setDraft}
        statuses={data.statuses}
        data={data}
        setData={setData}
        demoMode={demoMode}
        saveTask={saveTask}
        setTaskPendingDelete={setTaskPendingDelete}
        taskMessage={taskMessage}
        newTaskDetails={emptyNewTaskDetails()}
        setNewTaskDetails={() => undefined}
      />
      <ConfirmationDialog
        open={Boolean(taskPendingDelete)}
        setOpen={(open) => {
          if (!open) setTaskPendingDelete(null);
        }}
        title="Delete task?"
        description="This task and its related comments, attachments, and activity will be permanently removed."
        confirmLabel="Delete task"
        pendingLabel="Deleting..."
        pending={taskDeleting}
        destructive
        onConfirm={() => void deleteTask()}
      />
    </div>
  );
}
