"use client";

import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { toast } from "@ryanmeetup/ui";
import type { WorkspaceData } from "@/lib/types";
import {
  createTaskMutationService,
  type TaskDraft,
} from "@/lib/task-mutations";
import { TaskEditor } from "./TaskEditor";

function newDraft(data: WorkspaceData): TaskDraft {
  return {
    title: "",
    description: "",
    status_id:
      data.statuses.find((status) => status.is_default)?.id ??
      data.statuses[0]?.id ??
      "",
    project_id: null,
    assignee_id: null,
    reported_by: data.currentProfile.id,
    start_date: null,
    due_date: null,
    due_time: null,
    reminder_at: null,
    priority: "medium",
    category_ids: [],
  };
}

export function NewTaskModal({
  data,
  demoMode,
  open,
  setData,
  setOpen,
}: {
  data: WorkspaceData;
  demoMode: boolean;
  open: boolean;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  setOpen: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState(() => newDraft(data));
  const [createAnother, setCreateAnother] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function setModalOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && !saving) {
      setDraft(newDraft(data));
      setCreateAnother(false);
      setMessage("");
    }
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
      setMessage(validationMessage);
      toast.error(validationMessage);
      return;
    }

    setMessage("");
    setSaving(true);
    try {
      const mutations = createTaskMutationService({
        demoMode,
        getData: () => data,
        setData,
      });
      const saved = await mutations.save(draft, null);
      mutations.applySaved(saved, false);
      toast.success("Task created.");
      if (createAnother) {
        setDraft({
          ...newDraft(data),
          status_id: draft.status_id,
          priority: draft.priority,
          project_id: draft.project_id,
          assignee_id: draft.assignee_id,
          category_ids: [...draft.category_ids],
        });
      } else {
        setOpen(false);
        setDraft(newDraft(data));
        setCreateAnother(false);
        setMessage("");
      }
    } catch (error) {
      const nextMessage =
        error instanceof Error
          ? error.message
          : "The task could not be saved.";
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <TaskEditor
      taskOpen={open}
      setTaskOpen={setModalOpen}
      editing={null}
      taskDetailsOpen={false}
      setTaskDetailsOpen={() => undefined}
      createAnother={createAnother}
      setCreateAnother={setCreateAnother}
      taskSaving={saving}
      draft={draft}
      setDraft={setDraft}
      statuses={data.statuses}
      data={data}
      setData={setData}
      demoMode={demoMode}
      saveTask={saveTask}
      setTaskPendingDelete={() => undefined}
      taskMessage={message}
    />
  );
}
