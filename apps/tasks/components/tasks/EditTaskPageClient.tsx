"use client";

import { useMemo, useState, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationDialog, toast } from "@ryanmeetup/ui";
import {
  editorPageContentClassName,
  WorkspacePageShell,
} from "@/components/global";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useTaskEditorController } from "@/hooks/useTaskEditorController";
import { errorMessage } from "@/lib/presentation";
import { createTaskMutationService } from "@/lib/tasks/task-mutations";
import { taskEditorView } from "@/lib/tasks/task-editor-view";
import { taskKey, taskPath } from "@/lib/tasks/task-key";
import type { Task } from "@/lib/tasks/task-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import { TaskEditor } from "./TaskEditor";
import { BOARD_CRUMB, taskCrumb } from "./task-crumbs";

/**
 * `/task/[key]/edit` — the edit flow as a page, for phones.
 *
 * The whole save/validate/duplicate lifecycle comes from
 * `useTaskEditorController`, exactly as the board's dialog gets it. Only two
 * things are adapted for a route: dismissing navigates instead of closing a
 * dialog, and a saved task lands on its own page. The chrome is a page's own —
 * the trail down from the board through the task, and the fields in cards that
 * scroll with the document.
 *
 * Supporting details stay off. The checklist, files, and conversation live on
 * `/task/[key]`, which is one tap away, and leaving them out keeps the form to
 * the single column a phone can actually show.
 */
export function EditTaskPageClient({
  initialData,
  taskId,
  demoMode,
}: {
  initialData: WorkspaceData;
  taskId: string;
  demoMode: boolean;
}) {
  const { data, setData, getData } = useWorkspaceData(initialData, demoMode);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const mutations = useMemo(
    () => createTaskMutationService({ demoMode, getData, setData }),
    [demoMode, getData, setData],
  );
  const task =
    data.tasks.find((item) => item.id === taskId) ??
    initialData.tasks.find((item) => item.id === taskId)!;
  const backHref = taskPath(task);

  const assigneesByTask = useMemo(
    () =>
      new Map([
        [
          taskId,
          new Set(
            data.taskAssignees
              .filter((row) => row.task_id === taskId)
              .map((row) => row.profile_id),
          ),
        ],
      ]),
    [data.taskAssignees, taskId],
  );
  const categoriesByTask = useMemo(
    () =>
      new Map([
        [
          taskId,
          new Set(
            data.taskCategories
              .filter((row) => row.task_id === taskId)
              .map((row) => row.category_id),
          ),
        ],
      ]),
    [data.taskCategories, taskId],
  );

  const editor = useTaskEditorController({
    initialEditing: task,
    initialData,
    data,
    setData,
    demoMode,
    mutations,
    assigneesByTask,
    categoriesByTask,
    defaults: {
      statusId: task.status_id,
      categoryIds: [],
      projectId: task.project_id,
      assigneeIds: [],
      priority: task.priority,
    },
    afterSave: (saved, outcome) => {
      if (!outcome.createAnother) router.push(taskPath(saved.task));
    },
  });

  async function removeTask(id: string) {
    setDeleting(true);
    try {
      await mutations.remove(id);
      toast.success("Task deleted.");
      router.push("/board");
    } catch (error) {
      toast.error(errorMessage(error, "The task could not be deleted."));
      setDeleting(false);
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
        contentClassName={editorPageContentClassName}
      >
        <TaskEditor
          presentation="page"
          parents={[BOARD_CRUMB, taskCrumb(task)]}
          controller={{
            ...editor,
            modal: {
              ...editor.modal,
              /**
               * A page has no dialog to close, so a cancel is a navigation.
               * Duplicating is the exception: the controller keeps the form
               * mounted and swaps it to a create, which works here unchanged.
               */
              setOpen: (open: SetStateAction<boolean>) => {
                if (open === false) router.push(backHref);
              },
            },
          }}
          view={taskEditorView(data)}
          onDelete={setPendingDelete}
          showSupplementalDetails={false}
          showTaskPageLink={false}
        />
      </WorkspacePageShell>

      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        setOpen={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={`Delete ${pendingDelete ? taskKey(pendingDelete) : "task"}?`}
        description="This removes the task and everything attached to it. It cannot be undone."
        confirmLabel="Delete task"
        destructive
        pending={deleting}
        onConfirm={() => pendingDelete && removeTask(pendingDelete.id)}
      />
    </>
  );
}
