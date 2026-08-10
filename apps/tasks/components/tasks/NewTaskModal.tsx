"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { toast } from "@ryanmeetup/ui";
import type { WorkspaceData } from "@/lib/types";
import {
  createTaskMutationService,
  type TaskDraft,
} from "@/lib/task-mutations";
import { TaskEditor } from "./TaskEditor";
import {
  emptyNewTaskDetails,
  type NewTaskDetailsDraft,
} from "./NewTaskDetails";
import { persistNewTaskDetails } from "@/lib/new-task-details";
import {
  deleteTaskDraft,
  draftSavedStatus,
  hasDraftAutosaveContent,
  hasDraftContent,
  saveTaskDraft,
  taskDraftAutosaveDelayMs,
  type StoredTaskDraft,
} from "@/lib/task-drafts";

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
  initialDraft,
}: {
  data: WorkspaceData;
  demoMode: boolean;
  open: boolean;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  setOpen: (open: boolean) => void;
  initialDraft?: StoredTaskDraft | null;
}) {
  const [draft, setDraft] = useState(
    () => initialDraft?.draft ?? newDraft(data),
  );
  const [draftId, setDraftId] = useState<string | null>(
    initialDraft?.id ?? null,
  );
  const opened = useRef(false);
  const draftTouched = useRef(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [newTaskDetails, setNewTaskDetails] =
    useState<NewTaskDetailsDraft>(emptyNewTaskDetails);

  useEffect(() => {
    if (open && !opened.current && initialDraft) {
      setDraft(initialDraft.draft);
      setDraftId(initialDraft.id);
    }
    if (open && !opened.current) draftTouched.current = false;
    opened.current = open;
  }, [initialDraft, open]);

  useEffect(() => {
    if (!open || !draftTouched.current || !hasDraftAutosaveContent(draft))
      return;
    const timer = window.setTimeout(() => {
      const saved = saveTaskDraft(
        data.currentProfile.id,
        draft,
        draftId ?? undefined,
      );
      setDraftId(saved.id);
      toast.success(draftSavedStatus("auto"), {
        id: `task-draft-autosave-${data.currentProfile.id}`,
        duration: 2500,
      });
    }, taskDraftAutosaveDelayMs);
    return () => window.clearTimeout(timer);
  }, [data.currentProfile.id, draft, draftId, open]);

  function updateDraft(nextDraft: SetStateAction<TaskDraft>) {
    draftTouched.current = true;
    setDraft(nextDraft);
  }

  function saveAsDraft() {
    if (!hasDraftContent(draft)) {
      toast.error("Add a title or a few details before saving a draft.");
      return;
    }
    const saved = saveTaskDraft(
      data.currentProfile.id,
      draft,
      draftId ?? undefined,
    );
    setDraftId(saved.id);
    toast.success(draftSavedStatus("manual"));
    setOpen(false);
  }

  function setModalOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && !saving) {
      if (!hasDraftContent(draft)) setDraft(newDraft(data));
      setCreateAnother(false);
      setMessage("");
    }
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
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
      queueMicrotask(() => setOpen(true));
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
      const detailFailures = await persistNewTaskDetails({
        taskId: saved.task.id,
        draft: newTaskDetails,
        demoMode,
        setData,
      });
      setNewTaskDetails(emptyNewTaskDetails());
      if (draftId) deleteTaskDraft(data.currentProfile.id, draftId);
      toast.success("Task created.");
      if (detailFailures > 0)
        toast.error(
          `${detailFailures} ${detailFailures === 1 ? "task detail" : "task details"} could not be added. Open the task to retry.`,
        );
      if (createAnother) {
        draftTouched.current = false;
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
        setDraftId(null);
        setCreateAnother(false);
        setMessage("");
      }
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "The task could not be saved.";
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
      taskDetailsOpen={detailsOpen}
      setTaskDetailsOpen={setDetailsOpen}
      createAnother={createAnother}
      setCreateAnother={setCreateAnother}
      taskSaving={saving}
      draft={draft}
      setDraft={updateDraft}
      statuses={data.statuses}
      data={data}
      setData={setData}
      demoMode={demoMode}
      saveTask={saveTask}
      saveDraft={saveAsDraft}
      setTaskPendingDelete={() => undefined}
      taskMessage={message}
      newTaskDetails={newTaskDetails}
      setNewTaskDetails={setNewTaskDetails}
    />
  );
}
