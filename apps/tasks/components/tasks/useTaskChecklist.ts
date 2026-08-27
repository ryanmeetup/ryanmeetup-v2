"use client";

import { useState } from "react";
import {
  createSubtask,
  deleteSubtask,
  setSubtaskCompleted,
} from "@/lib/tasks/task-detail-mutations";
import { useWorkspaceWrite } from "@/hooks/useWorkspaceWrite";
import type { Subtask } from "@/lib/tasks/task-types";
import type { TaskDetailContext } from "./task-detail-context";

/** Checklist state and writes for one task. */
export function useTaskChecklist({
  task,
  data,
  demoMode,
  setData,
  recordActivity,
}: TaskDetailContext) {
  const write = useWorkspaceWrite(setData);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const items = data.subtasks.filter((item) => item.task_id === task.id);

  async function add() {
    const title = newItemTitle.trim();
    if (!title) return;
    const item: Subtask = {
      id: crypto.randomUUID(),
      task_id: task.id,
      title,
      is_completed: false,
      sort_order: items.length,
      created_by: data.currentProfile.id,
      created_at: new Date().toISOString(),
    };
    setNewItemTitle("");

    if (demoMode) {
      setData((current) => ({
        ...current,
        subtasks: [...current.subtasks, item],
      }));
      await recordActivity(`added checklist item “${title}”`);
      return;
    }

    setSaving(true);
    await write({
      apply: (current) => ({
        ...current,
        subtasks: [...current.subtasks, item],
      }),
      revert: (current) => ({
        ...current,
        subtasks: current.subtasks.filter((entry) => entry.id !== item.id),
      }),
      persist: () =>
        createSubtask({
          taskId: task.id,
          title,
          sortOrder: item.sort_order,
        }),
      reconcile:
        ({ subtask, activity }) =>
        (current) => ({
          ...current,
          subtasks: current.subtasks.map((entry) =>
            entry.id === item.id ? subtask : entry,
          ),
          activity: [
            activity,
            ...current.activity.filter((entry) => entry.id !== activity.id),
          ],
        }),
      whenFailed: "The checklist item could not be added.",
      onFailed: () => setNewItemTitle(title),
    });
    setSaving(false);
  }

  async function toggle(item: Subtask) {
    const completed = !item.is_completed;
    await write({
      apply: (current) => ({
        ...current,
        subtasks: current.subtasks.map((entry) =>
          entry.id === item.id ? { ...entry, is_completed: completed } : entry,
        ),
      }),
      revert: (current) => ({
        ...current,
        subtasks: current.subtasks.map((entry) =>
          entry.id === item.id ? item : entry,
        ),
      }),
      persist: demoMode
        ? undefined
        : () => setSubtaskCompleted(item.id, completed),
      reconcile:
        ({ subtask }) =>
        (current) => ({
          ...current,
          subtasks: current.subtasks.map((entry) =>
            entry.id === item.id ? subtask : entry,
          ),
        }),
      whenFailed: "The checklist item could not be updated.",
    });
  }

  async function remove(item: Subtask) {
    await write({
      apply: (current) => ({
        ...current,
        subtasks: current.subtasks.filter((entry) => entry.id !== item.id),
      }),
      revert: (current) => ({
        ...current,
        subtasks: [...current.subtasks, item],
      }),
      persist: demoMode ? undefined : () => deleteSubtask(item.id),
      whenFailed: "The checklist item could not be removed.",
    });
  }

  return { items, newItemTitle, setNewItemTitle, saving, add, toggle, remove };
}
