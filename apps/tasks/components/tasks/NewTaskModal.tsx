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
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import type { Task } from "@/lib/tasks/task-types";
import {
  createTaskMutationService,
  type TaskDraft,
} from "@/lib/tasks/task-mutations";
import { TaskEditor } from "./TaskEditor";
import { emptyNewTaskDetails } from "@/lib/tasks/task-draft-factory";
import type { NewTaskDetailsDraft } from "@/lib/tasks/task-types";
import { persistNewTaskDetails } from "@/lib/tasks/new-task-details";
import { errorMessage } from "@/lib/presentation";
import { newWorkspaceTaskDraft } from "@/lib/tasks/task-draft-factory";
import {
  deleteTaskDraft,
  draftSavedStatus,
  hasDraftAutosaveContent,
  hasDraftContent,
  saveTaskDraft,
  taskDraftAutosaveDelayMs,
  type StoredTaskDraft,
} from "@/lib/tasks/task-drafts";
import { taskKey, taskPath } from "@/lib/tasks/task-key";
import { taskEditorView } from "@/lib/tasks/task-editor-view";

export function NewTaskModal({
  data,
  demoMode,
  open,
  setData,
  setOpen,
  initialDraft,
  duplicateOf,
  onCreated,
}: {
  data: WorkspaceData;
  demoMode: boolean;
  open: boolean;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  setOpen: (open: boolean) => void;
  initialDraft?: StoredTaskDraft | null;
  /** Seeds the form from an existing task; mount this modal fresh to apply it. */
  duplicateOf?: { task: Task; draft: TaskDraft } | null;
  onCreated?: (task: Task) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(
    () =>
      duplicateOf?.draft ?? initialDraft?.draft ?? newWorkspaceTaskDraft(data),
  );
  const draftId = useRef<string | null>(initialDraft?.id ?? null);
  const opened = useRef(false);
  const draftTouched = useRef(false);
  const saveInFlight = useRef(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const detailsOpenByDefault = data.currentProfile.task_details_open_by_default;
  const [detailsOpen, setDetailsOpen] = useState(detailsOpenByDefault);
  const [newTaskDetails, setNewTaskDetails] =
    useState<NewTaskDetailsDraft>(emptyNewTaskDetails);

  useEffect(() => {
    if (open && !opened.current && initialDraft) {
      setDraft(initialDraft.draft);
      draftId.current = initialDraft.id;
    }
    if (open && !opened.current) {
      draftTouched.current = false;
      setDetailsOpen(detailsOpenByDefault);
    }
    opened.current = open;
  }, [detailsOpenByDefault, initialDraft, open]);

  useEffect(() => {
    if (
      !open ||
      saving ||
      !draftTouched.current ||
      !hasDraftAutosaveContent(draft)
    )
      return;
    const timer = window.setTimeout(() => {
      const saved = saveTaskDraft(
        data.currentProfile.id,
        draft,
        draftId.current ?? undefined,
      );
      draftId.current = saved.id;
      toast.success(draftSavedStatus("auto"), {
        id: `task-draft-autosave-${data.currentProfile.id}`,
        duration: 2500,
      });
    }, taskDraftAutosaveDelayMs);
    return () => window.clearTimeout(timer);
  }, [data.currentProfile.id, draft, open, saving]);

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
      draftId.current ?? undefined,
    );
    draftId.current = saved.id;
    toast.success(draftSavedStatus("manual"));
    setOpen(false);
  }

  function setModalOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && !saving) {
      if (!hasDraftContent(draft)) setDraft(newWorkspaceTaskDraft(data));
      setCreateAnother(false);
      setMessage("");
    }
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (saveInFlight.current) return;
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
    saveInFlight.current = true;
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
      if (draftId.current) {
        deleteTaskDraft(data.currentProfile.id, draftId.current);
        draftId.current = null;
      }
      toast.successWithLink("Task created:", {
        href: taskPath(saved.task),
        linkLabel: taskKey(saved.task),
      });
      if (detailFailures > 0)
        toast.error(
          `${detailFailures} ${detailFailures === 1 ? "task detail" : "task details"} could not be added. Open the task to retry.`,
        );
      await onCreated?.(saved.task);
      if (createAnother) {
        draftTouched.current = false;
        setDraft({
          ...newWorkspaceTaskDraft(data),
          status_id: draft.status_id,
          priority: draft.priority,
          project_id: draft.project_id,
          assignee_id: draft.assignee_id,
          category_ids: [...draft.category_ids],
        });
      } else {
        setOpen(false);
        setDraft(newWorkspaceTaskDraft(data));
        draftId.current = null;
        setCreateAnother(false);
        setMessage("");
      }
    } catch (error) {
      const nextMessage = errorMessage(error, "The task could not be saved.");
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <TaskEditor
      modal={{ open, setOpen: setModalOpen, detailsOpen, setDetailsOpen }}
      form={{
        draft,
        setDraft: updateDraft,
        saving,
        message,
        onSubmit: saveTask,
      }}
      view={taskEditorView(data)}
      mode={{
        kind: "create",
        duplicatedFrom: duplicateOf?.task ?? null,
        createAnother,
        setCreateAnother,
        details: newTaskDetails,
        setDetails: setNewTaskDetails,
        onSaveDraft: saveAsDraft,
      }}
    />
  );
}
