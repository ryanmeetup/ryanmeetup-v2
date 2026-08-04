"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { AnimatedCollapse, Button, DropdownSelect, ErrorCallout, Input, Modal, Pill, RichTextarea } from "@ryanmeetup/ui";
import { FiChevronDown, FiTrash2 } from "react-icons/fi";
import type { Priority, Status, Task, WorkspaceData } from "@/lib/types";
import type { TaskDraft } from "@/lib/task-mutations";
import { TaskDetails } from "./TaskDetails";

const priorities: Priority[] = ["low", "medium", "high", "urgent"];

function profileName(profile: { full_name: string }) {
  return profile.full_name || "Teammate";
}
export function TaskEditor({
  taskOpen, setTaskOpen, editing, taskDetailsOpen, setTaskDetailsOpen,
  createAnother, setCreateAnother, taskSaving, draft, setDraft, statuses,
  data, setData, demoMode, saveTask, setTaskPendingDelete, taskMessage,
}: {
  taskOpen: boolean;
  setTaskOpen: (open: boolean) => void;
  editing: Task | null;
  taskDetailsOpen: boolean;
  setTaskDetailsOpen: (open: boolean) => void;
  createAnother: boolean;
  setCreateAnother: (value: boolean) => void;
  taskSaving: boolean;
  draft: TaskDraft;
  setDraft: Dispatch<SetStateAction<TaskDraft>>;
  statuses: Status[];
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  demoMode: boolean;
  saveTask: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  setTaskPendingDelete: (task: Task | null) => void;
  taskMessage: string;
}) {
  return (
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
  );
}
