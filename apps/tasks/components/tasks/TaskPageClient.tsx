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
  toast,
} from "@ryanmeetup/ui";
import {
  FiActivity,
  FiCalendar,
  FiCheck,
  FiCheckSquare,
  FiClock,
  FiColumns,
  FiEdit3,
  FiFlag,
  FiFolder,
  FiLink,
  FiUser,
  FiUserCheck,
} from "react-icons/fi";
import { WorkspacePageShell } from "@/components/global";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { withAccessPreview } from "@/lib/access-preview";
import {
  createTaskMutationService,
  type TaskDraft,
} from "@/lib/task-mutations";
import { taskKey, taskPath } from "@/lib/task-key";
import { errorMessage } from "@/lib/presentation";
import { taskDraftFromTask } from "@/lib/task-draft-factory";
import type { Task } from "@/lib/task-types";
import type { WorkspaceData } from "@/lib/workspace-types";
import { TaskDetails } from "./TaskDetails";
import { TaskDueDate } from "./TaskDueDate";
import { TaskEditor } from "./TaskEditor";
import { TaskPriorityBadge } from "./TaskPriorityBadge";

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
  const [linkCopied, setLinkCopied] = useState(false);
  const copyConfirmationTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const conversationTopRef = useRef<HTMLDivElement>(null);
  const [conversationHeight, setConversationHeight] = useState<number>();
  const task =
    data.tasks.find((item) => item.id === taskId) ??
    initialData.tasks.find((item) => item.id === taskId)!;

  useEffect(() => {
    document.title = `${taskKey(task)}: ${task.title} | Ryan Meetup Tasks`;
  }, [task]);

  useEffect(
    () => () => {
      if (copyConfirmationTimerRef.current) {
        clearTimeout(copyConfirmationTimerRef.current);
      }
    },
    [],
  );

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
  const tags = categories.flatMap((category) =>
    (task.category_tags?.[category.id] ?? []).map((tag) => ({ category, tag })),
  );
  const makeDraft = () => taskDraftFromTask(task, categoryIds);
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
      const message = errorMessage(error, "The task could not be saved.");
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
      setLinkCopied(true);
      if (copyConfirmationTimerRef.current) {
        clearTimeout(copyConfirmationTimerRef.current);
      }
      copyConfirmationTimerRef.current = setTimeout(() => {
        setLinkCopied(false);
        copyConfirmationTimerRef.current = null;
      }, 2000);
      toast.success(`${taskKey(task!)} link copied.`);
    } catch {
      toast.error("The task link could not be copied.");
    }
  }

  return (
    <>
      <WorkspacePageShell
        data={data}
        demoMode={demoMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        setData={setData}
        contentClassName="mx-auto max-w-6xl space-y-5 p-4 sm:space-y-6 sm:p-6 lg:p-8"
      >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
            <div className="min-w-0 flex-1">
              <Breadcrumbs
                className="mb-2"
                crumbs={[
                  {
                    current: false,
                    href: withAccessPreview("/board", data.accessPreview),
                    icon: <FiColumns aria-hidden className="mr-2 shrink-0" />,
                    title: "Board",
                  },
                  {
                    current: true,
                    href: withAccessPreview(taskPath(task), data.accessPreview),
                    icon: (
                      <FiCheckSquare aria-hidden className="mr-2 shrink-0" />
                    ),
                    title: taskKey(task),
                  },
                ]}
              />
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
                {task.title}
              </h1>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={`transition-none w-full sm:w-auto ${
                  linkCopied
                    ? "border-emerald-500/60 bg-emerald-50 text-emerald-700 shadow-sm hover:border-emerald-500/60 hover:bg-emerald-50 dark:border-emerald-400/50 dark:bg-emerald-400/15 dark:text-emerald-300 dark:hover:border-emerald-400/50 dark:hover:bg-emerald-400/15"
                    : ""
                }`}
                leftIcon={
                  linkCopied ? (
                    <FiCheck
                      aria-hidden
                      className="text-emerald-600 motion-safe:animate-bounce dark:text-emerald-300"
                    />
                  ) : (
                    <FiLink aria-hidden />
                  )
                }
                onClick={copyLink}
              >
                <span aria-live="polite">
                  {linkCopied ? "Copied!" : "Copy link"}
                </span>
              </Button>
              <Button
                size="sm"
                className="w-full sm:w-auto"
                leftIcon={<FiEdit3 />}
                onClick={openEditor}
              >
                Edit task
              </Button>
            </div>
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="contents xl:block xl:space-y-6">
              <Card className="order-1 space-y-5">
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
                  <div>
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
                      Categories
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => (
                        <span
                          key={category.id}
                          className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold text-black/75 dark:text-white/80"
                          style={{
                            borderColor: `${category.color}99`,
                            backgroundColor: `${category.color}12`,
                          }}
                        >
                          <i
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {tags.length > 0 && (
                  <div>
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(({ category, tag }) => (
                        <span
                          key={`${category.id}-${tag}`}
                          title={category.name}
                          aria-label={`${category.name} / ${tag}`}
                          className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium text-black/70 dark:text-white/75"
                          style={{
                            borderColor: `${category.color}99`,
                            backgroundColor: `${category.color}12`,
                          }}
                        >
                          <i
                            aria-hidden
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              <TaskDetails
                task={task}
                workspace={{ data, demoMode, setData }}
                display={{
                  active: true,
                  pageLayout: true,
                  section: "work",
                  className: "order-3",
                }}
              />
              <TaskDetails
                task={task}
                workspace={{ data, demoMode, setData }}
                display={{
                  active: true,
                  pageLayout: true,
                  section: "comment",
                  className: "order-4",
                }}
              />
            </div>

            <div className="contents xl:sticky xl:top-24 xl:block xl:space-y-6">
              <Card className="order-2 space-y-5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black/55 dark:text-white/55">
                  Task details
                </h2>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:gap-x-6">
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
                    <dd className="mt-1">
                      <TaskPriorityBadge priority={task.priority} />
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
                  <div className="col-span-2">
                    <dt className="flex items-center gap-1.5 text-black/50 dark:text-white/50">
                      <FiFolder aria-hidden /> Project
                    </dt>
                    <dd className="mt-1 font-semibold">
                      {project?.name ?? "No project"}
                    </dd>
                  </div>
                </dl>
              </Card>

              <div
                ref={conversationTopRef}
                className="order-5 overflow-hidden rounded-2xl"
                style={
                  conversationHeight
                    ? { maxHeight: conversationHeight }
                    : undefined
                }
              >
                <TaskDetails
                  task={task}
                  workspace={{ data, demoMode, setData }}
                  display={{
                    active: true,
                    pageLayout: true,
                    section: "activity",
                    conversationHeight,
                  }}
                />
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
          setDraft,
          saving: taskSaving,
          message: taskMessage,
          onSubmit: saveTask,
        }}
        workspace={{ statuses: data.statuses, data, setData, demoMode }}
        mode={{ kind: "edit", task, onDelete: setTaskPendingDelete }}
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
    </>
  );
}
