"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  AnimatedCollapse,
  Button,
  DropdownSelect,
  ErrorCallout,
  IconButton,
  Input,
  Modal,
  ModalActions,
  MultiSelect,
  Pill,
  RichTextarea,
  toast,
  Tooltip,
} from "@ryanmeetup/ui";
import {
  FiChevronDown,
  FiCopy,
  FiExternalLink,
  FiLink,
  FiTrash2,
} from "react-icons/fi";
import type { Priority, Status, Task } from "@/lib/tasks/task-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import type { TaskDraft } from "@/lib/tasks/task-mutations";
import { taskKey, taskPath } from "@/lib/tasks/task-key";
import { profileDisplayName } from "@/lib/presentation";
import { TaskDetails } from "./TaskDetails";
import { TaskKeyBadge } from "./TaskKeyBadge";
import type { NewTaskDetailsDraft } from "@/lib/tasks/task-types";
import { NewTaskDetails } from "./NewTaskDetails";
import { TaskFields } from "./TaskFields";
import type { TaskEditorController } from "@/hooks/useTaskEditorController";

const priorities: Priority[] = ["low", "medium", "high", "urgent"];

export type TaskEditorModalState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  detailsOpen: boolean;
  setDetailsOpen: (open: boolean) => void;
};

export type TaskEditorFormState = {
  draft: TaskDraft;
  setDraft: Dispatch<SetStateAction<TaskDraft>>;
  saving: boolean;
  message: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export type TaskEditorWorkspace = {
  statuses: Status[];
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  demoMode: boolean;
};

export type TaskEditorMode =
  | {
      kind: "create";
      /** The task this draft was copied from, when it started as a duplicate. */
      duplicatedFrom?: Task | null;
      createAnother: boolean;
      setCreateAnother: (value: boolean) => void;
      details: NewTaskDetailsDraft;
      setDetails: Dispatch<SetStateAction<NewTaskDetailsDraft>>;
      onSaveDraft?: () => void;
    }
  | {
      kind: "edit";
      task: Task;
      onDelete: (task: Task) => void;
      /** Reopen the same fields as a new task. Omit to hide the action. */
      onDuplicate?: () => void;
    };

type TaskEditorProps =
  | {
      controller: TaskEditorController;
      workspace: TaskEditorWorkspace;
      onDelete: (task: Task) => void;
      showSupplementalDetails?: boolean;
      showTaskPageLink?: boolean;
    }
  | {
      modal: TaskEditorModalState;
      form: TaskEditorFormState;
      workspace: TaskEditorWorkspace;
      mode: TaskEditorMode;
      showSupplementalDetails?: boolean;
      showTaskPageLink?: boolean;
    };

export function TaskEditor(props: TaskEditorProps) {
  const { modal, form, mode, workspace } =
    "controller" in props
      ? { ...props.controller, workspace: props.workspace }
      : props;
  const onDelete =
    "controller" in props
      ? props.onDelete
      : (task: Task) => props.mode.kind === "edit" && props.mode.onDelete(task);
  const onDuplicate =
    "controller" in props
      ? props.controller.openDuplicate
      : props.mode.kind === "edit"
        ? props.mode.onDuplicate
        : undefined;
  const { open, setOpen, detailsOpen, setDetailsOpen } = modal;
  const { draft, setDraft, saving, message, onSubmit } = form;
  const { statuses, data, setData, demoMode } = workspace;
  const editing = mode.kind === "edit" ? mode.task : null;
  const duplicatedFrom =
    mode.kind === "create" ? (mode.duplicatedFrom ?? null) : null;
  const titledTask = editing ?? duplicatedFrom;
  const showSupplementalDetails = props.showSupplementalDetails ?? true;
  const showTaskPageLink = props.showTaskPageLink ?? true;
  const supplementalDetailsOpen = showSupplementalDetails && detailsOpen;
  async function copyTaskLink() {
    if (!editing) return;
    try {
      await navigator.clipboard.writeText(
        new URL(taskPath(editing), window.location.origin).toString(),
      );
      toast.success(`${taskKey(editing)} link copied.`);
    } catch {
      toast.error("The task link could not be copied.");
    }
  }
  const tagOptions = data.categories
    .filter((category) => draft.category_ids.includes(category.id))
    .flatMap((category) =>
      (category.tags ?? []).map((tag) => ({
        group: { color: category.color, label: category.name },
        label: tag,
        value: JSON.stringify([category.id, tag]),
      })),
    );
  const selectedTagValues = Object.entries(draft.category_tags).flatMap(
    ([categoryId, tags]) =>
      tags.map((tag) => JSON.stringify([categoryId, tag])),
  );

  function updateTags(values: string[]) {
    const categoryTags: Record<string, string[]> = {};
    for (const value of values) {
      const [categoryId, tag] = JSON.parse(value) as [string, string];
      categoryTags[categoryId] = [...(categoryTags[categoryId] ?? []), tag];
    }
    setDraft({ ...draft, category_tags: categoryTags });
  }

  return (
    <Modal
      open={open}
      setIsOpen={setOpen}
      title={
        titledTask ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>{editing ? "Edit Task" : "New task from"}</span>
            <TaskKeyBadge task={titledTask} />
          </span>
        ) : (
          "A new thing to do"
        )
      }
      size={supplementalDetailsOpen ? "2xl" : "lg"}
      panelClassName="transition-[max-width] duration-300 ease-out motion-reduce:transition-none"
      supportingActions={
        <>
          {editing && (
            <>
              <IconButton
                type="button"
                label="Copy task link"
                size="md"
                onClick={copyTaskLink}
              >
                <FiLink />
              </IconButton>
              {showTaskPageLink && (
                <IconButton.Link
                  href={taskPath(editing)}
                  label="View task page"
                  size="md"
                >
                  <FiExternalLink />
                </IconButton.Link>
              )}
              {onDuplicate && (
                <IconButton
                  type="button"
                  label="Duplicate task"
                  size="md"
                  disabled={saving}
                  onClick={onDuplicate}
                >
                  <FiCopy />
                </IconButton>
              )}
              <IconButton
                type="button"
                label="Delete task"
                variant="danger"
                size="md"
                onClick={() => onDelete(editing)}
              >
                <FiTrash2 />
              </IconButton>
            </>
          )}
          {mode.kind === "create" && (
            <label className="flex w-fit cursor-pointer items-center gap-3 text-sm font-medium text-black/70 dark:text-white/70">
              <input
                type="checkbox"
                checked={mode.createAnother}
                onChange={(event) =>
                  mode.setCreateAnother(event.target.checked)
                }
                disabled={saving}
                className="h-4 w-4 rounded border-black/20 accent-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:accent-white dark:focus-visible:ring-white/40"
              />
              Create another
            </label>
          )}
        </>
      }
      actions={
        <>
          {mode.kind === "create" && mode.onSaveDraft && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={mode.onSaveDraft}
              disabled={saving}
            >
              Save draft
            </Button>
          )}
          <ModalActions
            confirmForm="task-editor-form"
            confirmLabel={editing ? "Save changes" : "Create task"}
            onCancel={() => setOpen(false)}
            pending={saving}
            pendingLabel="Saving..."
          />
        </>
      }
    >
      <form
        id="task-editor-form"
        className="min-w-0 space-y-5"
        onSubmit={onSubmit}
      >
        <div
          className={
            supplementalDetailsOpen
              ? "grid items-start transition-[grid-template-columns,gap] duration-300 ease-out motion-reduce:transition-none lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8"
              : "grid items-start transition-[grid-template-columns,gap] duration-300 ease-out motion-reduce:transition-none lg:grid-cols-[minmax(0,1fr)_0fr] lg:gap-0"
          }
        >
          <div className="min-w-0 space-y-5">
            <TaskFields
              draft={draft}
              setDraft={setDraft}
              options={{
                statuses,
                categories: data.categories,
                projects: data.projects,
                favoriteProjectIds:
                  data.currentProfile.favorite_project_ids ?? [],
                profiles: data.profiles,
                currentProfileId: data.currentProfile.id,
                accessibleCategoryIds:
                  data.accessPreview?.accessibleCategoryIds,
              }}
            />
            {false && (
              <>
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
                    onChange={(value) =>
                      setDraft({ ...draft, status_id: value })
                    }
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
                      {data.categories
                        .filter(
                          (item) =>
                            !item.archived_at ||
                            draft.category_ids.includes(item.id),
                        )
                        .map((item) => {
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
                                    category_tags: selected
                                      ? Object.fromEntries(
                                          Object.entries(
                                            draft.category_tags,
                                          ).filter(
                                            ([categoryId]) =>
                                              categoryId !== item.id,
                                          ),
                                        )
                                      : draft.category_tags,
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
                    proximityValue={data.currentProfile.id}
                    value={draft.assignee_id ?? ""}
                    onChange={(value) =>
                      setDraft({ ...draft, assignee_id: value || null })
                    }
                    options={[
                      { label: "Unassigned", value: "" },
                      ...data.profiles.map((item) => ({
                        avatar: {
                          name: profileDisplayName(item),
                          src: item.avatar_url,
                        },
                        label: profileDisplayName(item),
                        value: item.id,
                      })),
                    ]}
                  />
                  <DropdownSelect
                    variant="field"
                    label="Reported by"
                    proximityValue={data.currentProfile.id}
                    required
                    value={draft.reported_by}
                    onChange={(value) =>
                      setDraft({ ...draft, reported_by: value })
                    }
                    options={data.profiles.map((item) => ({
                      avatar: {
                        name: profileDisplayName(item),
                        src: item.avatar_url,
                      },
                      label: profileDisplayName(item),
                      value: item.id,
                    }))}
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
                  <MultiSelect
                    label="Tags"
                    options={tagOptions}
                    value={selectedTagValues}
                    onChange={updateTags}
                    searchable
                    searchPlaceholder="Search tags"
                    disabled={tagOptions.length === 0}
                    placeholder={
                      draft.category_ids.length === 0
                        ? "Select a category first"
                        : "No tags for selected categories"
                    }
                  />
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
                    <Tooltip
                      content="Reminders are coming soon."
                      triggerClassName="w-full !block !text-sm !font-normal !normal-case !tracking-normal"
                    >
                      <span
                        className="block w-full cursor-help"
                        tabIndex={0}
                        aria-label="Reminder is coming soon"
                      >
                        <input
                          type="datetime-local"
                          value=""
                          disabled
                          aria-label="Reminder (coming soon)"
                          className="cursor-not-allowed"
                        />
                      </span>
                    </Tooltip>
                  </label>
                </div>
              </>
            )}
            {showSupplementalDetails && !detailsOpen && (
              <button
                type="button"
                aria-expanded="false"
                aria-controls="task-secondary-details"
                className="group flex w-full items-center gap-4 rounded-xl border border-black/15 bg-black/[0.025] p-4 text-left transition hover:border-black/30 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/15 dark:bg-white/[0.035] dark:hover:border-white/30 dark:hover:bg-white/[0.07] dark:focus-visible:ring-white/30"
                onClick={() => setDetailsOpen(true)}
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
          {showSupplementalDetails && (
            <AnimatedCollapse
              id="task-secondary-details"
              open={detailsOpen}
              className="min-w-0"
              contentClassName="min-w-0 lg:border-l lg:border-black/10 lg:pl-8 lg:dark:border-white/10"
            >
              <div className="mb-5 flex flex-col items-stretch gap-3 border-b border-black/10 pb-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full min-w-0">
                  <p className="text-sm font-semibold">Task details</p>
                  <p className="text-xs text-black/55 dark:text-white/55">
                    {editing
                      ? "Checklist, files, conversation, and history"
                      : "Checklist, files, and conversation"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full whitespace-nowrap sm:w-auto sm:shrink-0"
                  rightIcon={<FiChevronDown className="rotate-180" />}
                  aria-expanded="true"
                  aria-controls="task-secondary-details"
                  onClick={() => setDetailsOpen(false)}
                >
                  Hide details
                </Button>
              </div>
              {mode.kind === "edit" ? (
                <TaskDetails
                  key={mode.task.id}
                  task={mode.task}
                  workspace={{ data, setData, demoMode }}
                  display={{ active: open, className: "!border-t-0 !pt-0" }}
                />
              ) : (
                <NewTaskDetails
                  value={mode.details}
                  onChange={mode.setDetails}
                  disabled={saving}
                />
              )}
            </AnimatedCollapse>
          )}
        </div>
        <ErrorCallout>{message}</ErrorCallout>
      </form>
    </Modal>
  );
}
