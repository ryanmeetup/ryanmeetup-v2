"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import Image from "next/image";
import {
  Avatar,
  Button,
  Card,
  ConfirmationDialog,
  DisclosureCard,
  IconButton,
  Input,
  Textarea,
  Tooltip,
  toast,
} from "@ryanmeetup/ui";
import {
  FiCheck,
  FiEdit2,
  FiExternalLink,
  FiFile,
  FiLink,
  FiMessageSquare,
  FiPaperclip,
  FiPlus,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { MAX_ATTACHMENT_SIZE } from "@/lib/task-attachments";
import { attachmentUrlName } from "@/lib/task-attachment-urls";
import { CountBadge } from "@/components/global";
import { normalizeHttpUrl } from "@ryanmeetup/utils";
import type {
  Subtask,
  Task,
  TaskActivity,
  TaskAttachment,
  TaskComment,
  WorkspaceData,
} from "@/lib/types";

type TaskDetailsProps = {
  active: boolean;
  className?: string;
  data: WorkspaceData;
  demoMode: boolean;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  task: Task;
  pageLayout?: boolean;
  section?: "all" | "work" | "comment" | "activity";
  conversationHeight?: number;
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

function formatFileSize(size: number | null) {
  if (size === null) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFileType(mimeType: string | null) {
  return mimeType?.split("/").at(-1)?.toUpperCase() ?? null;
}

export function TaskDetails({
  active,
  className,
  data,
  demoMode,
  setData,
  task,
  pageLayout = false,
  section = "all",
  conversationHeight,
}: TaskDetailsProps) {
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [comment, setComment] = useState("");
  const [editingComment, setEditingComment] = useState<TaskComment | null>(
    null,
  );
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [commentPendingDelete, setCommentPendingDelete] =
    useState<TaskComment | null>(null);
  const [commentSaving, setCommentSaving] = useState(false);
  const [draggingFiles, setDraggingFiles] = useState(false);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const completed = subtasks.filter((item) => item.is_completed).length;

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
          <DisclosureCard
            defaultOpen
            className=""
            buttonClassName="flex w-full items-center justify-between gap-3 py-1 text-left"
            panelClassName="space-y-3 pt-3"
            iconClassName="h-3.5 w-3.5"
            summary={
              <span className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                  Checklist
                </span>
                <CountBadge>{subtasks.length}</CountBadge>
              </span>
            }
          >
            {subtasks.length > 0 && (
              <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${(completed / subtasks.length) * 100}%` }}
                />
              </div>
            )}
            {subtasks.length > 0 && (
              <div className="max-h-[min(11.7rem,22.75svh)] space-y-3 overflow-y-auto overscroll-contain pr-2">
                {subtasks.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Tooltip
                      content={`${item.is_completed ? "Reopen" : "Complete"} ${item.title}`}
                    >
                      <button
                        type="button"
                        aria-label={`${item.is_completed ? "Reopen" : "Complete"} ${item.title}`}
                        onClick={() => void toggleSubtask(item)}
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${item.is_completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-black/20 dark:border-white/25"}`}
                      >
                        {item.is_completed && <FiCheck aria-hidden />}
                      </button>
                    </Tooltip>
                    <span
                      className={`min-w-0 flex-1 text-sm ${item.is_completed ? "text-black/45 line-through dark:text-white/45" : ""}`}
                    >
                      {item.title}
                    </span>
                    <IconButton
                      label={`Delete “${item.title}”`}
                      variant="danger"
                      onClick={() => void removeSubtask(item)}
                    >
                      <FiTrash2 />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}
            <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0 flex-1">
                <Input
                  label="New checklist item"
                  hideLabel
                  name="new-subtask"
                  value={subtaskTitle}
                  onChange={(event) => setSubtaskTitle(event.target.value)}
                  placeholder="Add a checklist item…"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addSubtask();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="action"
                leftIcon={<FiPlus />}
                onClick={() => void addSubtask()}
                loading={detailSaving}
                disabled={detailSaving || !subtaskTitle.trim()}
                className="w-full sm:w-auto"
              >
                Add
              </Button>
            </div>
          </DisclosureCard>

          <DisclosureCard
            defaultOpen
            className=""
            buttonClassName="flex w-full items-center justify-between gap-3 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/25 dark:focus-visible:ring-white/30"
            panelClassName="space-y-3 pt-3"
            iconClassName="h-3.5 w-3.5"
            summary={
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
                <FiPaperclip aria-hidden /> Attachments
                <CountBadge>{attachments.length}</CountBadge>
              </span>
            }
          >
            {previewAttachment && (
              <div className="overflow-hidden rounded-xl border border-black/10 bg-black/[0.025] dark:border-white/10 dark:bg-white/[0.035]">
                <div className="relative aspect-[4/3] w-full bg-black/5 dark:bg-black/30">
                  <Image
                    src={previewAttachment.url}
                    alt={`Preview of ${previewAttachment.name}`}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 40vw, 90vw"
                    className="object-contain"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-black/10 px-3 py-2 dark:border-white/10">
                  <p className="min-w-0 truncate text-sm font-semibold">
                    {previewAttachment.name}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    <Tooltip content="Open original">
                      <a
                        href={previewAttachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${previewAttachment.name} in a new tab`}
                        className="grid h-9 w-9 place-items-center rounded-lg transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:bg-white/10 dark:focus-visible:ring-white/30"
                      >
                        <FiExternalLink aria-hidden />
                      </a>
                    </Tooltip>
                    <IconButton
                      label="Close attachment preview"
                      onClick={() => setPreviewAttachment(null)}
                    >
                      <FiX />
                    </IconButton>
                  </div>
                </div>
              </div>
            )}
            {attachments.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-black/10 p-2 dark:border-white/10"
              >
                {item.mime_type?.startsWith("image/") && item.url !== "#" ? (
                  <button
                    type="button"
                    aria-label={`Preview ${item.name}`}
                    aria-pressed={previewAttachment?.id === item.id}
                    onClick={() => setPreviewAttachment(item)}
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:bg-white/5 dark:focus-visible:ring-white/30"
                  >
                    <Image
                      src={item.url}
                      alt=""
                      fill
                      unoptimized
                      sizes="48px"
                      className="object-cover"
                    />
                  </button>
                ) : item.file_path === null && item.url !== "#" ? (
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-black/5 text-black/55 dark:bg-white/5 dark:text-white/55">
                    <FiLink aria-hidden />
                  </span>
                ) : (
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-black/5 text-black/55 dark:bg-white/5 dark:text-white/55">
                    <FiFile aria-hidden />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="mt-0.5 truncate text-xs text-black/50 dark:text-white/50">
                    {[
                      formatFileType(item.mime_type),
                      formatFileSize(item.size_bytes),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Attachment"}
                  </p>
                </div>
                <Tooltip content="Open in new tab">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${item.name} in a new tab`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:bg-white/10 dark:focus-visible:ring-white/30"
                  >
                    <FiExternalLink aria-hidden />
                  </a>
                </Tooltip>
                <IconButton
                  label={`Remove “${item.name}”`}
                  variant="danger"
                  onClick={() => void removeAttachment(item)}
                >
                  <FiTrash2 />
                </IconButton>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Input
                label="Attachment URL"
                name={`task-${task.id}-attachment-url`}
                type="url"
                value={attachmentUrl}
                placeholder="https://example.com/resource"
                disabled={addingUrl}
                onChange={(event) => setAttachmentUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  void addUrlAttachment();
                }}
              />
              <Button
                type="button"
                variant="action"
                leftIcon={<FiLink aria-hidden />}
                disabled={!attachmentUrl.trim()}
                loading={addingUrl}
                loadingText="Adding..."
                className="w-full sm:w-auto"
                onClick={() => void addUrlAttachment()}
              >
                Add URL
              </Button>
            </div>
            <div
              className={`rounded-xl border border-dashed p-3 text-center transition duration-200 ease-in-out sm:p-4 ${
                draggingFiles
                  ? "border-black/50 bg-black/5 ring-2 ring-black/10 dark:border-white/60 dark:bg-white/10 dark:ring-white/15"
                  : "border-black/20 bg-black/[0.02] dark:border-white/20 dark:bg-white/[0.03]"
              }`}
              onDragEnter={(event) => {
                event.preventDefault();
                if (event.dataTransfer.types.includes("Files"))
                  setDraggingFiles(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDragLeave={(event) => {
                const nextTarget = event.relatedTarget;
                if (
                  !(nextTarget instanceof Node) ||
                  !event.currentTarget.contains(nextTarget)
                ) {
                  setDraggingFiles(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDraggingFiles(false);
                void uploadFiles(Array.from(event.dataTransfer.files));
              }}
            >
              <FiPaperclip className="mx-auto mb-1.5 h-5 w-5 text-black/45 dark:text-white/45 sm:mb-2" />
              <p className="text-sm font-semibold">
                <span className="sm:hidden">Add files</span>
                <span className="hidden sm:inline">Drop files here</span>
              </p>
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                <span className="sm:hidden">
                  Choose files · 10 MB maximum each
                </span>
                <span className="hidden sm:inline">
                  Paste, drop, or choose files · 10 MB maximum per file
                </span>
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 w-full sm:w-auto"
                loading={uploadingFiles}
                loadingText="Uploading..."
                onClick={() => fileInputRef.current?.click()}
              >
                Choose files
              </Button>
              <input
                ref={fileInputRef}
                aria-label="Upload task attachments"
                type="file"
                multiple
                accept=".pdf,.txt,image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  void uploadFiles(files);
                  event.target.value = "";
                }}
              />
            </div>
          </DisclosureCard>
        </DetailGroup>
      )}

      {(section === "all" || section === "comment") && (
        <DetailGroup card={pageLayout} className="!pt-5">
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
              <FiMessageSquare /> Comments
              <CountBadge>{comments.length}</CountBadge>
            </h3>
            {comments.length > 0 && (
              <div className="max-h-72 space-y-3 overflow-y-auto overscroll-contain pr-2">
                {comments.map((item) => {
                  const profile = data.profiles.find(
                    (entry) => entry.id === item.created_by,
                  );
                  const canManageComment =
                    !data.accessPreview &&
                    item.created_by === data.currentProfile.id;
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 border-l-2 border-black/10 pl-3 text-sm dark:border-white/10"
                    >
                      <Avatar
                        name={profile?.full_name || "Teammate"}
                        size="sm"
                        src={profile?.avatar_url}
                      />
                      <div className="min-w-0 flex-1">
                        {editingComment?.id === item.id ? (
                          <div className="space-y-2">
                            <Textarea
                              id={`edit-comment-${item.id}`}
                              label="Edit comment"
                              hideLabel
                              name={`edit-comment-${item.id}`}
                              value={editingCommentBody}
                              onChange={(event) =>
                                setEditingCommentBody(event.target.value)
                              }
                              rows={2}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={commentSaving}
                                onClick={() => setEditingComment(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                loading={commentSaving}
                                disabled={!editingCommentBody.trim()}
                                onClick={() => void updateComment()}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="block">
                              <strong>
                                {profile?.full_name || "Teammate"}
                              </strong>{" "}
                              {item.body}
                            </span>
                            <span className="flex flex-wrap items-center gap-1.5 text-xs text-black/45 dark:text-white/45">
                              <time>
                                {new Intl.DateTimeFormat("en-US", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                }).format(new Date(item.created_at))}
                              </time>
                              {item.edited_at && (
                                <span
                                  aria-label={`Edited ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.edited_at))}`}
                                >
                                  · Edited
                                </span>
                              )}
                            </span>
                          </>
                        )}
                      </div>
                      {canManageComment && editingComment?.id !== item.id && (
                        <span className="flex shrink-0 gap-1">
                          <IconButton
                            label="Edit comment"
                            onClick={() => {
                              setEditingComment(item);
                              setEditingCommentBody(item.body);
                            }}
                          >
                            <FiEdit2 />
                          </IconButton>
                          <IconButton
                            label="Delete comment"
                            variant="danger"
                            onClick={() => setCommentPendingDelete(item)}
                          >
                            <FiTrash2 />
                          </IconButton>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <Textarea
              id="task-comment"
              label="Comment"
              hideLabel
              name="task-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Add a comment…"
              rows={2}
            />
            <div className="grid w-full grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={!comment.trim()}
                onClick={() => setComment("")}
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="action"
                className="w-full"
                disabled={!comment.trim()}
                onClick={() => void addComment()}
              >
                Comment
              </Button>
            </div>
          </section>
        </DetailGroup>
      )}

      {(section === "all" || section === "activity") && (
        <DetailGroup card={pageLayout} className="overflow-hidden">
          <DisclosureCard
            defaultOpen={pageLayout}
            className=""
            buttonClassName="flex w-full items-center justify-between gap-3 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/25 dark:focus-visible:ring-white/30"
            panelClassName="space-y-3 pt-3"
            iconClassName="h-3.5 w-3.5"
            summary={
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
                Activity
                <CountBadge>{activity.length}</CountBadge>
              </span>
            }
          >
            {detailsLoading && (
              <p
                role="status"
                className="text-sm text-black/60 dark:text-white/60"
              >
                Loading task history…
              </p>
            )}
            <div
              className={`${pageLayout ? "min-h-48" : "max-h-32"} space-y-3 overflow-y-auto overscroll-contain pr-2`}
              style={
                pageLayout && conversationHeight
                  ? {
                      maxHeight: Math.max(
                        192,
                        conversationHeight - (hasMoreActivity ? 170 : 112),
                      ),
                    }
                  : undefined
              }
            >
              {activity.map((item) => {
                const profile = data.profiles.find(
                  (entry) => entry.id === item.actor_id,
                );
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 border-l-2 border-black/10 pl-3 text-sm dark:border-white/10"
                  >
                    <Avatar
                      name={profile?.full_name || "System"}
                      size="sm"
                      src={profile?.avatar_url}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block">
                        <strong>{profile?.full_name || "System"}</strong>{" "}
                        {item.action}
                      </span>
                      <time className="text-xs text-black/45 dark:text-white/45">
                        {new Intl.DateTimeFormat("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.created_at))}
                      </time>
                    </span>
                  </div>
                );
              })}
            </div>
            {hasMoreActivity && (
              <Button
                type="button"
                variant="secondary"
                loading={detailsLoading}
                onClick={() => void loadDetails(activityPage + 1)}
              >
                Load older activity
              </Button>
            )}
          </DisclosureCard>
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
