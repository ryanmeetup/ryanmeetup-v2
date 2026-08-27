"use client";

import { ConfirmationDialog } from "@ryanmeetup/ui";
import type { Task } from "@/lib/tasks/task-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import type { Status } from "@/lib/tasks/task-types";
import type { TaskEditorController } from "@/hooks/useTaskEditorController";
import { TaskEditor } from "./TaskEditor";
import { CategoriesModal } from "@/components/categories";
import { ProjectsModal } from "@/components/projects";

/**
 * The dialog layer that sits above the board and the list: the task editor,
 * the delete confirmation, and the category and project editors the header and
 * the sidebar open.
 */
export function TaskWorkspaceModals({
  workspace,
  editor,
  deletion,
  categories,
  projects,
}: {
  workspace: {
    data: WorkspaceData;
    setData: React.Dispatch<React.SetStateAction<WorkspaceData>>;
    demoMode: boolean;
    statuses: Status[];
  };
  editor: TaskEditorController;
  deletion: {
    task: Task | null;
    setTask: (task: Task | null) => void;
    pending: boolean;
    onConfirm: (id: string) => void;
  };
  categories: {
    open: boolean;
    setOpen: (open: boolean) => void;
    editId: string | null;
    setEditId: (id: string | null) => void;
    selectedId?: string;
    onRename: (name: string) => void;
  };
  projects: {
    open: boolean;
    setOpen: (open: boolean) => void;
    editId: string | null;
    setEditId: (id: string | null) => void;
    selectedId?: string;
    onRename: (name: string) => void;
  };
}) {
  const { data, setData, demoMode, statuses } = workspace;
  return (
    <>
      <TaskEditor
        controller={editor}
        workspace={{ statuses, data, setData, demoMode }}
        onDelete={deletion.setTask}
      />
      <ConfirmationDialog
        open={Boolean(deletion.task)}
        setOpen={(nextOpen) => {
          if (!nextOpen) deletion.setTask(null);
        }}
        title="Delete Task?"
        description="This task and its related comments, attachments, and activity will be permanently removed."
        confirmLabel="Delete task"
        pendingLabel="Deleting..."
        pending={deletion.pending}
        destructive
        onConfirm={() => {
          if (deletion.task) deletion.onConfirm(deletion.task.id);
        }}
      />
      {categories.open && (
        <CategoriesModal
          modal={{
            open: categories.open,
            setOpen: (nextOpen) => {
              categories.setOpen(nextOpen);
              if (!nextOpen) categories.setEditId(null);
            },
          }}
          workspace={{ data, setData, demoMode }}
          options={{ editCategoryId: categories.editId, createOnly: true }}
          events={{
            onCategoryUpdated: (updatedCategory) => {
              if (categories.selectedId === updatedCategory.id)
                categories.onRename(updatedCategory.name);
            },
          }}
        />
      )}
      {projects.open && (
        <ProjectsModal
          modal={{
            open: projects.open,
            setOpen: (nextOpen) => {
              projects.setOpen(nextOpen);
              if (!nextOpen) projects.setEditId(null);
            },
          }}
          workspace={{ data, setData, demoMode }}
          options={{ editProjectId: projects.editId, createOnly: true }}
          events={{
            onProjectUpdated: (updatedProject) => {
              if (projects.selectedId === updatedProject.id)
                projects.onRename(updatedProject.name);
            },
          }}
        />
      )}
    </>
  );
}
