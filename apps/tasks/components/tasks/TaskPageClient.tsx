"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Breadcrumbs,
  Button,
  Card,
  ConfirmationDialog,
  DropdownMenu,
  DropdownMenuButton,
  DropdownMenuItem,
  DropdownMenuItems,
  DropdownMenuSeparator,
  FormattedText,
  toast,
} from "@ryanmeetup/ui";
import {
  FiActivity,
  FiCalendar,
  FiCheckSquare,
  FiClock,
  FiColumns,
  FiEdit3,
  FiFlag,
  FiFolder,
  FiLink,
  FiMoreHorizontal,
  FiTrash2,
  FiUser,
  FiUserCheck,
} from "react-icons/fi";
import { WorkspacePageShell } from "@/components/global";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { withAccessPreview } from "@/lib/access/access-preview";
import {
  createTaskMutationService,
  type TaskDraft,
} from "@/lib/tasks/task-mutations";
import { taskKey, taskPath } from "@/lib/tasks/task-key";
import { errorMessage } from "@/lib/presentation";
import { taskDraftFromTask } from "@/lib/tasks/task-draft-factory";
import type { Task } from "@/lib/tasks/task-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
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
    setTaskDetailsOpen(false);
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
      toast.successWithLink("Task updated:", {
        href: taskPath(saved.task),
        linkLabel: taskKey(saved.task),
      });
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
        contentClassName="mx-4 min-w-0 max-w-6xl space-y-5 py-4 sm:mx-6 sm:space-y-6 sm:py-6 lg:mx-8 lg:py-8 2xl:mx-auto"
      >
          <div className="min-w-0 space-y-2">
            <Breadcrumbs
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
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:gap-6">
              <h1 className="min-w-0 break-words text-3xl font-bold leading-tight sm:text-4xl">
                {task.title}
              </h1>
              <div className="flex shrink-0 items-center gap-2 sm:justify-self-end xl:w-full xl:self-end xl:justify-end">
                <Button size="sm" leftIcon={<FiEdit3 />} onClick={openEditor}>
                  Edit task
                </Button>
                <DropdownMenu>
                  <DropdownMenuButton
                    unstyled
                    aria-label="More task actions"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 text-black transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/10 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30"
                  >
                    <FiMoreHorizontal aria-hidden />
                  </DropdownMenuButton>
                  <DropdownMenuItems align="end">
                    <DropdownMenuItem onClick={copyLink}>
                      <FiLink aria-hidden /> Copy link
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      destructive
                      onClick={() => setTaskPendingDelete(task)}
                    >
                      <FiTrash2 aria-hidden /> Delete task
                    </DropdownMenuItem>
                  </DropdownMenuItems>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="contents min-w-0 xl:block xl:space-y-6">
              <Card className="order-1 min-w-0 space-y-5">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black/55 dark:text-white/55">
                    Description
                  </h2>
                  {task.description ? (
                    <FormattedText
                      text={task.description}
                      className="mt-3 min-w-0 break-words text-sm leading-7 text-black/75 dark:text-white/75"
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

            <div className="contents min-w-0 xl:sticky xl:top-24 xl:block xl:space-y-6">
              <Card className="order-2 min-w-0 space-y-5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black/55 dark:text-white/55">
                  Task details
                </h2>
                <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 text-sm sm:gap-x-6">
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
                    <dd className="mt-1 flex min-w-0 items-center gap-2 break-words font-semibold">
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
                    <dd className="mt-1 flex min-w-0 items-center gap-2 break-words font-semibold">
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
                    <dd className="mt-1 flex min-w-0 items-center gap-2 break-words font-semibold">
                      <Avatar
                        name={assignee?.full_name ?? "Unassigned"}
                        src={assignee?.avatar_url}
                        size="sm"
                      />
                      {assignee?.full_name ?? "Unassigned"}
                    </dd>
                  </div>
                  <div className="col-span-2 min-w-0">
                    <dt className="flex items-center gap-1.5 text-black/50 dark:text-white/50">
                      <FiFolder aria-hidden /> Project
                    </dt>
                    <dd className="mt-1 break-words font-semibold">
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
        showSupplementalDetails={false}
        showTaskPageLink={false}
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
        title="Delete Task?"
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
