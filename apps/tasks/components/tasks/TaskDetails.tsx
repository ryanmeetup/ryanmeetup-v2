"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Card, ConfirmationDialog, toast } from "@ryanmeetup/ui";
import { MAX_ATTACHMENT_SIZE } from "@/lib/task-attachments";
import { attachmentUrlName } from "@/lib/task-attachment-urls";
import { normalizeHttpUrl } from "@ryanmeetup/utils";
import type {
  Subtask,
  Task,
  TaskActivity,
  TaskAttachment,
  TaskComment,
  WorkspaceData,
} from "@/lib/types";
import { TaskActivityPanel } from "./TaskActivityPanel";
import { TaskChecklistPanel } from "./TaskChecklistPanel";
import { TaskCommentsPanel } from "./TaskCommentsPanel";
import { TaskAttachmentsPanel } from "./TaskAttachmentsPanel";

type TaskDetailsProps = {
  task: Task;
  workspace: {
    data: WorkspaceData;
    demoMode: boolean;
    setData: Dispatch<SetStateAction<WorkspaceData>>;
  };
  display: {
    active: boolean;
    className?: string;
    pageLayout?: boolean;
    section?: "all" | "work" | "comment" | "activity";
    conversationHeight?: number;
  };
};

function DetailGroup({
  card,
  className,
  children,
  header,
}: {
  card: boolean;
  className?: string;
  children: ReactNode;
  header?: ReactNode;
}) {
  return card ? (
    <Card className={`space-y-6 ${className ?? ""}`}>
      {header}
      {children}
    </Card>
  ) : (
    <>{children}</>
  );
}

const now = () => new Date().toISOString();

export function TaskDetails({ task, workspace, display }: TaskDetailsProps) {
  const { data, demoMode, setData } = workspace;
  const {
    active,
    className,
    pageLayout = false,
    section = "all",
    conversationHeight,
  } = display;
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [comment, setComment] = useState("");
  const [editingComment, setEditingComment] = useState<TaskComment | null>(
    null,
  );
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [commentPendingDelete, setCommentPendingDelete] =
    useState<TaskComment | null>(null);
  const [commentSaving, setCommentSaving] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [previewAttachment, setPreviewAttachment] =
    useState<TaskAttachment | null>(null);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(
    !demoMode && (section === "all" || section === "activity"),
  );
  const [activityPage, setActivityPage] = useState(0);
  const [hasMoreActivity, setHasMoreActivity] = useState(false);
  const subtasks = data.subtasks.filter((item) => item.task_id === task.id);
  const attachments = data.attachments.filter(
    (item) =>
      item.task_id === task.id &&
      (item.file_path ||
        item.mime_type ||
        item.size_bytes !== null ||
        item.url !== "#"),
  );
  const comments = useMemo(
    () =>
      data.comments
        .filter((item) => item.task_id === task.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [data.comments, task.id],
  );
  const activity = useMemo(
    () =>
      data.activity
        .filter((item) => item.task_id === task.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [data.activity, task.id],
  );

  async function loadDetails(page = 0) {
    if (demoMode) return;
    setDetailsLoading(true);
    try {
      const response = await fetch(
        `/api/task-details?taskId=${encodeURIComponent(task.id)}&activityPage=${page}`,
      );
      const result = (await response.json()) as {
        error?: string;
        subtasks?: Subtask[];
        comments?: TaskComment[];
        activity?: TaskActivity[];
        attachments?: TaskAttachment[];
        activityPage?: { hasMore: boolean };
      };
      if (!response.ok)
        throw new Error(result.error ?? "Task details could not be loaded.");
      setData((current) => ({
        ...current,
        subtasks:
          page === 0
            ? [
                ...current.subtasks.filter((item) => item.task_id !== task.id),
                ...(result.subtasks ?? []),
              ]
            : current.subtasks,
        comments:
          page === 0
            ? [
                ...current.comments.filter((item) => item.task_id !== task.id),
                ...(result.comments ?? []),
              ]
            : current.comments,
        attachments:
          page === 0
            ? [
                ...current.attachments.filter(
                  (item) => item.task_id !== task.id,
                ),
                ...(result.attachments ?? []),
              ]
            : current.attachments,
        activity: [
          ...current.activity.filter(
            (item) =>
              item.task_id !== task.id ||
              !(result.activity ?? []).some((next) => next.id === item.id),
          ),
          ...(result.activity ?? []),
        ],
      }));
      setActivityPage(page);
      setHasMoreActivity(result.activityPage?.hasMore ?? false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Task details could not be loaded.",
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  useEffect(() => {
    if (section !== "all" && section !== "activity") return;
    const timer = window.setTimeout(() => void loadDetails(0), 0);
    return () => window.clearTimeout(timer);
    // Detail data is scoped to the selected task and loaded only when opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, demoMode, section]);

  async function recordActivity(action: string) {
    const activity: TaskActivity = {
      id: crypto.randomUUID(),
      task_id: task.id,
      actor_id: data.currentProfile.id,
      action,
      details: {},
      created_at: now(),
    };
    setData((current) => ({
      ...current,
      activity: [activity, ...current.activity],
    }));
  }

  async function addSubtask() {
    const title = subtaskTitle.trim();
    if (!title) return;
    const item: Subtask = {
      id: crypto.randomUUID(),
      task_id: task.id,
      title,
      is_completed: false,
      sort_order: subtasks.length,
      created_by: data.currentProfile.id,
      created_at: now(),
    };
    setData((current) => ({
      ...current,
      subtasks: [...current.subtasks, item],
    }));
    setSubtaskTitle("");
    if (demoMode) {
      await recordActivity(`added checklist item “${title}”`);
      return;
    }
    setDetailSaving(true);
    try {
      const response = await fetch("/api/task-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "subtask",
          taskId: task.id,
          value: title,
          sortOrder: item.sort_order,
        }),
      });
      const result = (await response.json()) as {
        subtask?: Subtask;
        activity?: TaskActivity;
        error?: string;
      };
      if (!response.ok || !result.subtask || !result.activity)
        throw new Error(
          result.error ?? "The checklist item could not be added.",
        );
      setData((current) => ({
        ...current,
        subtasks: current.subtasks.map((entry) =>
          entry.id === item.id ? result.subtask! : entry,
        ),
        activity: [
          result.activity!,
          ...current.activity.filter(
            (entry) => entry.id !== result.activity!.id,
          ),
        ],
      }));
    } catch (error) {
      setData((current) => ({
        ...current,
        subtasks: current.subtasks.filter((entry) => entry.id !== item.id),
      }));
      setSubtaskTitle(title);
      toast.error(
        error instanceof Error
          ? error.message
          : "The checklist item could not be added.",
      );
    } finally {
      setDetailSaving(false);
    }
  }

  async function toggleSubtask(item: Subtask) {
    setData((current) => ({
      ...current,
      subtasks: current.subtasks.map((entry) =>
        entry.id === item.id
          ? { ...entry, is_completed: !entry.is_completed }
          : entry,
      ),
    }));
    if (!demoMode)
      try {
        const response = await fetch("/api/task-details", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, completed: !item.is_completed }),
        });
        const result = (await response.json()) as {
          subtask?: Subtask;
          error?: string;
        };
        if (!response.ok || !result.subtask)
          throw new Error(
            result.error ?? "The checklist item could not be updated.",
          );
        setData((current) => ({
          ...current,
          subtasks: current.subtasks.map((entry) =>
            entry.id === item.id ? result.subtask! : entry,
          ),
        }));
      } catch (error) {
        setData((current) => ({
          ...current,
          subtasks: current.subtasks.map((entry) =>
            entry.id === item.id ? item : entry,
          ),
        }));
        toast.error(
          error instanceof Error
            ? error.message
            : "The checklist item could not be updated.",
        );
      }
  }

  async function removeSubtask(item: Subtask) {
    setData((current) => ({
      ...current,
      subtasks: current.subtasks.filter((entry) => entry.id !== item.id),
    }));
    if (!demoMode)
      try {
        const response = await fetch(
          `/api/task-details?id=${encodeURIComponent(item.id)}`,
          { method: "DELETE" },
        );
        const result = (await response.json()) as { error?: string };
        if (!response.ok)
          throw new Error(
            result.error ?? "The checklist item could not be removed.",
          );
      } catch (error) {
        setData((current) => ({
          ...current,
          subtasks: [...current.subtasks, item],
        }));
        toast.error(
          error instanceof Error
            ? error.message
            : "The checklist item could not be removed.",
        );
      }
  }

  async function addComment() {
    const body = comment.trim();
    if (!body) return;
    const item: TaskComment = {
      id: crypto.randomUUID(),
      task_id: task.id,
      body,
      created_by: data.currentProfile.id,
      created_at: now(),
      edited_at: null,
    };
    setData((current) => ({
      ...current,
      comments: [...current.comments, item],
    }));
    setComment("");
    if (!demoMode)
      try {
        const response = await fetch("/api/task-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "comment",
            taskId: task.id,
            value: body,
          }),
        });
        const result = (await response.json()) as {
          comment?: TaskComment;
          error?: string;
        };
        if (!response.ok || !result.comment)
          throw new Error(result.error ?? "The comment could not be added.");
        setData((current) => ({
          ...current,
          comments: current.comments.map((entry) =>
            entry.id === item.id ? result.comment! : entry,
          ),
        }));
      } catch (error) {
        setData((current) => ({
          ...current,
          comments: current.comments.filter((entry) => entry.id !== item.id),
        }));
        setComment(body);
        toast.error(
          error instanceof Error
            ? error.message
            : "The comment could not be added.",
        );
      }
  }

  async function updateComment() {
    if (!editingComment) return;
    const body = editingCommentBody.trim();
    if (!body) return;
    const original = editingComment;
    setCommentSaving(true);
    setData((current) => ({
      ...current,
      comments: current.comments.map((item) =>
        item.id === original.id ? { ...item, body, edited_at: now() } : item,
      ),
    }));
    try {
      if (!demoMode) {
        const response = await fetch("/api/task-details", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "comment",
            id: original.id,
            value: body,
          }),
        });
        const result = (await response.json()) as {
          comment?: TaskComment;
          error?: string;
        };
        if (!response.ok || !result.comment)
          throw new Error(result.error ?? "The comment could not be updated.");
        setData((current) => ({
          ...current,
          comments: current.comments.map((item) =>
            item.id === original.id ? result.comment! : item,
          ),
        }));
      }
      setEditingComment(null);
      toast.success("Comment updated.");
    } catch (error) {
      setData((current) => ({
        ...current,
        comments: current.comments.map((item) =>
          item.id === original.id ? original : item,
        ),
      }));
      toast.error(
        error instanceof Error
          ? error.message
          : "The comment could not be updated.",
      );
    } finally {
      setCommentSaving(false);
    }
  }

  async function deleteComment() {
    if (!commentPendingDelete) return;
    const original = commentPendingDelete;
    setCommentSaving(true);
    setData((current) => ({
      ...current,
      comments: current.comments.filter((item) => item.id !== original.id),
    }));
    try {
      if (!demoMode) {
        const response = await fetch(
          `/api/task-details?kind=comment&id=${encodeURIComponent(original.id)}`,
          { method: "DELETE" },
        );
        const result = (await response.json()) as { error?: string };
        if (!response.ok)
          throw new Error(result.error ?? "The comment could not be deleted.");
      }
      setCommentPendingDelete(null);
      toast.success("Comment deleted.");
    } catch (error) {
      setData((current) => ({
        ...current,
        comments: [...current.comments, original],
      }));
      toast.error(
        error instanceof Error
          ? error.message
          : "The comment could not be deleted.",
      );
    } finally {
      setCommentSaving(false);
    }
  }

  async function addAttachment(attachment: TaskAttachment) {
    setData((current) => ({
      ...current,
      attachments: [...current.attachments, attachment],
    }));
    await recordActivity(`attached “${attachment.name}”`);
  }

  async function uploadFile(file: File) {
    if (!demoMode) {
      const formData = new FormData();
      formData.set("taskId", task.id);
      formData.set("file", file);
      const response = await fetch("/api/task-attachments", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        attachment?: TaskAttachment;
        activity?: TaskActivity;
        error?: string;
      };
      if (!response.ok || !result.attachment)
        throw new Error(result.error ?? "The upload was rejected.");
      setData((current) => ({
        ...current,
        attachments: [...current.attachments, result.attachment!],
        activity: result.activity
          ? [result.activity, ...current.activity]
          : current.activity,
      }));
      return;
    }
    await addAttachment({
      id: crypto.randomUUID(),
      task_id: task.id,
      name: file.name,
      url: "#",
      file_path: null,
      mime_type: file.type || null,
      size_bytes: file.size,
      created_by: data.currentProfile.id,
      created_at: now(),
    });
  }

  async function uploadFiles(files: File[]) {
    if (uploadingFiles || files.length === 0) return;
    const validFiles = files.filter((file) => {
      if (file.size > 0 && file.size <= MAX_ATTACHMENT_SIZE) return true;
      toast.error(`${file.name} must be between 1 byte and 10 MB.`);
      return false;
    });
    if (validFiles.length === 0) return;

    setUploadingFiles(true);
    let uploaded = 0;
    for (const file of validFiles) {
      try {
        await uploadFile(file);
        uploaded += 1;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? `${file.name}: ${error.message}`
            : `${file.name} could not be uploaded.`,
        );
      }
    }
    setUploadingFiles(false);
    if (uploaded > 0)
      toast.success(
        `${uploaded} ${uploaded === 1 ? "file" : "files"} attached.`,
      );
  }

  async function addUrlAttachment() {
    const url = normalizeHttpUrl(attachmentUrl);
    if (!url) {
      toast.error("Enter a valid web address.");
      return;
    }
    if (attachments.some((item) => item.url === url)) {
      toast.error("That URL is already attached.");
      return;
    }

    setAddingUrl(true);
    try {
      if (demoMode) {
        await addAttachment({
          id: crypto.randomUUID(),
          task_id: task.id,
          name: attachmentUrlName(url),
          url,
          file_path: null,
          mime_type: null,
          size_bytes: null,
          created_by: data.currentProfile.id,
          created_at: now(),
        });
      } else {
        const response = await fetch("/api/task-attachments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: task.id, url }),
        });
        const result = (await response.json()) as {
          attachment?: TaskAttachment;
          activity?: TaskActivity;
          error?: string;
        };
        if (!response.ok || !result.attachment)
          throw new Error(result.error ?? "The URL could not be attached.");
        setData((current) => ({
          ...current,
          attachments: [...current.attachments, result.attachment!],
          activity: result.activity
            ? [result.activity, ...current.activity]
            : current.activity,
        }));
      }
      setAttachmentUrl("");
      toast.success("URL attached.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The URL could not be attached.",
      );
    } finally {
      setAddingUrl(false);
    }
  }

  useEffect(() => {
    if (!active || (section !== "all" && section !== "work")) return;

    const handlePaste = (event: ClipboardEvent) => {
      if (uploadingFiles) return;

      const files = Array.from(event.clipboardData?.items ?? []).flatMap(
        (item) => {
          if (item.kind !== "file") return [];
          const file = item.getAsFile();
          return file ? [file] : [];
        },
      );

      if (files.length === 0) return;
      event.preventDefault();
      void uploadFiles(files);
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  });

  async function removeAttachment(item: TaskAttachment) {
    if (previewAttachment?.id === item.id) setPreviewAttachment(null);
    setData((current) => ({
      ...current,
      attachments: current.attachments.filter((entry) => entry.id !== item.id),
    }));
    if (!demoMode)
      try {
        const response = await fetch(
          `/api/task-attachments?id=${encodeURIComponent(item.id)}`,
          { method: "DELETE" },
        );
        const result = (await response.json()) as { error?: string };
        if (!response.ok)
          throw new Error(
            result.error ?? "The attachment could not be removed.",
          );
      } catch (error) {
        setData((current) => ({
          ...current,
          attachments: [...current.attachments, item],
        }));
        toast.error(
          error instanceof Error
            ? error.message
            : "The attachment could not be removed.",
        );
      }
  }

  return (
    <div
      className={`${pageLayout ? "" : "space-y-6 border-t border-black/10 pt-6 dark:border-white/10"} ${className ?? ""}`}
    >
      {(section === "all" || section === "work") && (
        <DetailGroup
          card={pageLayout}
          header={
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-black/55 dark:text-white/55">
              Task work
            </h2>
          }
        >
          <TaskChecklistPanel
            items={subtasks}
            newItemTitle={subtaskTitle}
            onAdd={() => void addSubtask()}
            onDelete={(item) => void removeSubtask(item)}
            onNewItemTitleChange={setSubtaskTitle}
            onToggle={(item) => void toggleSubtask(item)}
            saving={detailSaving}
          />

          <TaskAttachmentsPanel
            addingUrl={addingUrl}
            attachmentUrl={attachmentUrl}
            attachments={attachments}
            onAddUrl={() => void addUrlAttachment()}
            onAttachmentUrlChange={setAttachmentUrl}
            onRemove={(item) => void removeAttachment(item)}
            onUploadFiles={(files) => void uploadFiles(files)}
            previewAttachment={previewAttachment}
            setPreviewAttachment={setPreviewAttachment}
            taskId={task.id}
            uploadingFiles={uploadingFiles}
          />
        </DetailGroup>
      )}

      {(section === "all" || section === "comment") && (
        <DetailGroup card={pageLayout} className="!pt-5">
          <TaskCommentsPanel
            comment={comment}
            comments={comments}
            currentProfileId={data.currentProfile.id}
            editingBody={editingCommentBody}
            editingComment={editingComment}
            onCancelEdit={() => setEditingComment(null)}
            onClear={() => setComment("")}
            onCommentChange={setComment}
            onDelete={setCommentPendingDelete}
            onEdit={(item) => {
              setEditingComment(item);
              setEditingCommentBody(item.body);
            }}
            onEditingBodyChange={setEditingCommentBody}
            onSave={() => void updateComment()}
            onSubmit={() => void addComment()}
            previewing={Boolean(data.accessPreview)}
            profiles={data.profiles}
            saving={commentSaving}
          />
        </DetailGroup>
      )}

      {(section === "all" || section === "activity") && (
        <DetailGroup card={pageLayout} className="overflow-hidden">
          <TaskActivityPanel
            activity={activity}
            conversationHeight={conversationHeight}
            hasMore={hasMoreActivity}
            loading={detailsLoading}
            onLoadMore={() => void loadDetails(activityPage + 1)}
            pageLayout={pageLayout}
            profiles={data.profiles}
          />
        </DetailGroup>
      )}
      <ConfirmationDialog
        open={Boolean(commentPendingDelete)}
        setOpen={(open) => {
          if (!open) setCommentPendingDelete(null);
        }}
        title="Delete comment?"
        description="This comment will be permanently removed."
        confirmLabel="Delete comment"
        pendingLabel="Deleting..."
        pending={commentSaving}
        destructive
        buttonSize="sm"
        onConfirm={() => void deleteComment()}
      />
    </div>
  );
}
