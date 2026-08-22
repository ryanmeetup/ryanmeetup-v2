"use client";

import { useEffect, useRef, useState, type SetStateAction } from "react";
import { toast } from "@ryanmeetup/ui";
import type { Task } from "@/lib/tasks/task-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import type {
  createTaskMutationService,
  TaskDraft,
} from "@/lib/tasks/task-mutations";
import {
  editTaskDraft,
  emptyNewTaskDetails,
  emptyTaskDraft,
} from "@/lib/tasks/task-draft-factory";
import type { NewTaskDetailsDraft } from "@/lib/tasks/task-types";
import {
  deleteTaskDraft,
  draftSavedStatus,
  hasDraftAutosaveContent,
  hasDraftContent,
  saveTaskDraft,
  taskDraftAutosaveDelayMs,
} from "@/lib/tasks/task-drafts";
import { errorMessage } from "@/lib/presentation";
import { persistNewTaskDetails } from "@/lib/tasks/new-task-details";
import { taskKey, taskPath } from "@/lib/tasks/task-key";

type MutationService = ReturnType<typeof createTaskMutationService>;

export type TaskEditorController = ReturnType<typeof useTaskEditorController>;

export function useTaskEditorController({
  initialEditing,
  initialData,
  data,
  setData,
  demoMode,
  mutations,
  categoriesByTask,
  defaults,
  afterSave,
}: {
  initialEditing: Task | null;
  initialData: WorkspaceData;
  data: WorkspaceData;
  setData: React.Dispatch<React.SetStateAction<WorkspaceData>>;
  demoMode: boolean;
  mutations: MutationService;
  categoriesByTask: Map<string, Set<string>>;
  defaults: {
    statusId: string;
    categoryIds: string[];
    projectId: string | null;
    assigneeId: string | null;
    priority: TaskDraft["priority"];
  };
  afterSave: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(Boolean(initialEditing));
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(initialEditing) &&
      initialData.currentProfile.task_details_open_by_default,
  );
  const [editing, setEditing] = useState<Task | null>(initialEditing);
  const [draft, setDraftState] = useState<TaskDraft>(() =>
    initialEditing
      ? editTaskDraft(
          initialEditing,
          initialData.taskCategories
            .filter((row) => row.task_id === initialEditing.id)
            .map((row) => row.category_id),
        )
      : emptyTaskDraft(defaults.statusId, initialData.currentProfile.id),
  );
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [details, setDetails] =
    useState<NewTaskDetailsDraft>(emptyNewTaskDetails);
  const [createAnother, setCreateAnother] = useState(false);
  const draftId = useRef<string | null>(null);
  const touched = useRef(false);
  const saveInFlight = useRef(false);

  function setDraft(next: SetStateAction<TaskDraft>) {
    touched.current = true;
    setDraftState(next);
  }

  useEffect(() => {
    if (
      !open ||
      saving ||
      editing ||
      !touched.current ||
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
  }, [data.currentProfile.id, draft, editing, open, saving]);

  function openCreate(statusId = defaults.statusId) {
    setMessage("");
    setEditing(null);
    setDetailsOpen(data.currentProfile.task_details_open_by_default);
    setCreateAnother(false);
    draftId.current = null;
    setDetails(emptyNewTaskDetails());
    touched.current = false;
    setDraftState({
      ...emptyTaskDraft(statusId, data.currentProfile.id),
      category_ids:
        defaults.categoryIds.length === 1 ? [...defaults.categoryIds] : [],
      project_id: defaults.projectId,
      assignee_id: defaults.assigneeId,
      priority: defaults.priority,
    });
    setOpen(true);
  }

  function openEdit(task: Task) {
    setMessage("");
    setEditing(task);
    setDetailsOpen(data.currentProfile.task_details_open_by_default);
    setCreateAnother(false);
    draftId.current = null;
    setDraftState(editTaskDraft(task, categoriesByTask.get(task.id) ?? []));
    setOpen(true);
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (saveInFlight.current) return;
    const validationMessage = !draft.title.trim()
      ? "A task title is required."
      : !draft.status_id
        ? "A status is required."
        : !draft.priority
          ? "A priority is required."
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
      const saved = await mutations.save(draft, editing);
      mutations.applySaved(saved, Boolean(editing));
      let detailFailures = 0;
      if (!editing) {
        detailFailures = await persistNewTaskDetails({
          taskId: saved.task.id,
          draft: details,
          demoMode,
          setData,
        });
        setDetails(emptyNewTaskDetails());
      }
      if (!editing && draftId.current) {
        deleteTaskDraft(data.currentProfile.id, draftId.current);
        draftId.current = null;
      }
      await afterSave();
      if (!editing && createAnother) {
        touched.current = false;
        setDraftState({
          ...emptyTaskDraft(draft.status_id, data.currentProfile.id),
          priority: draft.priority,
          category_ids: [...draft.category_ids],
          project_id: draft.project_id,
          assignee_id: draft.assignee_id,
        });
        toast.successWithLink("Task created. Add the next one:", {
          href: taskPath(saved.task),
          linkLabel: taskKey(saved.task),
        });
      } else {
        setOpen(false);
        const movedTo =
          editing &&
          data.statuses.find(
            (status) =>
              status.id === draft.status_id && status.id !== editing.status_id,
          );
        toast.successWithLink(
          movedTo
            ? `Task moved to ${movedTo.name}:`
            : editing
              ? "Task updated:"
              : "Task created:",
          {
            href: taskPath(saved.task),
            linkLabel: taskKey(saved.task),
          },
        );
      }
      if (detailFailures > 0)
        toast.error(
          `${detailFailures} ${detailFailures === 1 ? "task detail" : "task details"} could not be added${createAnother ? "." : ". Open the task to retry."}`,
        );
    } catch (error) {
      const nextMessage = errorMessage(error, "The task could not be saved.");
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  return {
    modal: { open, setOpen, detailsOpen, setDetailsOpen },
    form: { draft, setDraft, saving, message, onSubmit: submit },
    mode: editing
      ? ({ kind: "edit", task: editing } as const)
      : ({
          kind: "create",
          createAnother,
          setCreateAnother,
          details,
          setDetails,
          onSaveDraft: saveAsDraft,
        } as const),
    editing,
    openCreate,
    openEdit,
  };
}
