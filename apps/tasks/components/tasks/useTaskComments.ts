"use client";

import { useMemo, useState } from "react";
import { toast } from "@ryanmeetup/ui";
import {
  createComment,
  deleteComment,
  updateComment,
} from "@/lib/tasks/task-detail-mutations";
import { useWorkspaceWrite } from "@/hooks/useWorkspaceWrite";
import type { TaskComment } from "@/lib/tasks/task-types";
import type { TaskDetailContext } from "./task-detail-context";

/** Comment threads, their drafts, and their writes for one task. */
export function useTaskComments({
  task,
  data,
  demoMode,
  setData,
}: TaskDetailContext) {
  const write = useWorkspaceWrite(setData);
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState("");
  const [replyingTo, setReplyingTo] = useState<TaskComment | null>(null);
  const [editing, setEditing] = useState<TaskComment | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [pendingDelete, setPendingDelete] = useState<TaskComment | null>(null);
  const [saving, setSaving] = useState(false);

  const comments = useMemo(
    () =>
      data.comments
        .filter((item) => item.task_id === task.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [data.comments, task.id],
  );

  async function add(parent: TaskComment | null = null) {
    const body = (parent ? reply : draft).trim();
    if (!body) return;
    const item: TaskComment = {
      id: crypto.randomUUID(),
      task_id: task.id,
      parent_id: parent?.id ?? null,
      body,
      created_by: data.currentProfile.id,
      created_at: new Date().toISOString(),
      edited_at: null,
    };

    setSaving(true);
    if (parent) {
      setReply("");
      setReplyingTo(null);
    } else setDraft("");

    await write({
      apply: (current) => ({
        ...current,
        comments: [...current.comments, item],
      }),
      revert: (current) => ({
        ...current,
        comments: current.comments.filter((entry) => entry.id !== item.id),
      }),
      persist: demoMode
        ? undefined
        : () =>
            createComment({
              taskId: task.id,
              parentId: parent?.id ?? null,
              body,
            }),
      reconcile:
        ({ comment }) =>
        (current) => ({
          ...current,
          comments: current.comments.map((entry) =>
            entry.id === item.id ? comment : entry,
          ),
        }),
      whenFailed: "The comment could not be added.",
      onFailed: () => {
        if (parent) {
          setReply(body);
          setReplyingTo(parent);
        } else setDraft(body);
      },
    });
    setSaving(false);
  }

  async function saveEdit() {
    if (!editing) return;
    const body = editingBody.trim();
    if (!body) return;
    const original = editing;

    setSaving(true);
    const saved = await write({
      apply: (current) => ({
        ...current,
        comments: current.comments.map((item) =>
          item.id === original.id
            ? { ...item, body, edited_at: new Date().toISOString() }
            : item,
        ),
      }),
      revert: (current) => ({
        ...current,
        comments: current.comments.map((item) =>
          item.id === original.id ? original : item,
        ),
      }),
      persist: demoMode ? undefined : () => updateComment(original.id, body),
      reconcile:
        ({ comment }) =>
        (current) => ({
          ...current,
          comments: current.comments.map((item) =>
            item.id === original.id ? comment : item,
          ),
        }),
      whenFailed: "The comment could not be updated.",
    });
    if (saved) {
      setEditing(null);
      toast.success("Comment updated.");
    }
    setSaving(false);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const original = pendingDelete;

    setSaving(true);
    const deleted = await write({
      apply: (current) => ({
        ...current,
        comments: current.comments.filter((item) => item.id !== original.id),
      }),
      revert: (current) => ({
        ...current,
        comments: [...current.comments, original],
      }),
      persist: demoMode ? undefined : () => deleteComment(original.id),
      whenFailed: "The comment could not be deleted.",
    });
    if (deleted) {
      setPendingDelete(null);
      if (replyingTo?.id === original.id) {
        setReply("");
        setReplyingTo(null);
      }
      toast.success("Comment deleted.");
    }
    setSaving(false);
  }

  return {
    comments,
    draft,
    setDraft,
    reply,
    setReply,
    replyingTo,
    setReplyingTo,
    editing,
    setEditing,
    editingBody,
    setEditingBody,
    pendingDelete,
    setPendingDelete,
    saving,
    add,
    saveEdit,
    confirmDelete,
  };
}
