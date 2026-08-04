"use client";

import {
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Avatar,
  Button,
  DisclosureCard,
  IconButton,
  Input,
  Textarea,
  Tooltip,
  toast,
} from "@ryanmeetup/ui";
import {
  FiCheck,
  FiFile,
  FiMessageSquare,
  FiPaperclip,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import type {
  Subtask,
  Task,
  TaskActivity,
  TaskAttachment,
  TaskComment,
  WorkspaceData,
} from "@/lib/types";

type TaskDetailsProps = {
  className?: string;
  data: WorkspaceData;
  demoMode: boolean;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  task: Task;
};

const now = () => new Date().toISOString();
const maxAttachmentSize = 10 * 1024 * 1024;

export function TaskDetails({
  className,
  data,
  demoMode,
  setData,
  task,
}: TaskDetailsProps) {
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [comment, setComment] = useState("");
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtasks = data.subtasks.filter((item) => item.task_id === task.id);
  const attachments = data.attachments.filter(
    (item) =>
      item.task_id === task.id &&
      (item.file_path || item.mime_type || item.size_bytes !== null),
  );
  const timeline = useMemo(
    () =>
      [
        ...data.comments
          .filter((item) => item.task_id === task.id)
          .map((item) => ({ ...item, kind: "comment" as const })),
        ...data.activity
          .filter((item) => item.task_id === task.id)
          .map((item) => ({ ...item, kind: "activity" as const })),
      ].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [data.activity, data.comments, task.id],
  );

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
    if (!demoMode) await createClient().from("task_activity").insert(activity);
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
    if (!demoMode) await createClient().from("subtasks").insert(item);
    await recordActivity(`added checklist item “${title}”`);
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
      await createClient()
        .from("subtasks")
        .update({ is_completed: !item.is_completed })
        .eq("id", item.id);
  }

  async function removeSubtask(item: Subtask) {
    setData((current) => ({
      ...current,
      subtasks: current.subtasks.filter((entry) => entry.id !== item.id),
    }));
    if (!demoMode)
      await createClient().from("subtasks").delete().eq("id", item.id);
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
    };
    setData((current) => ({
      ...current,
      comments: [...current.comments, item],
    }));
    setComment("");
    if (!demoMode) await createClient().from("task_comments").insert(item);
  }

  async function addAttachment(attachment: TaskAttachment) {
    if (!demoMode) {
      const { error } = await createClient()
        .from("task_attachments")
        .insert(attachment);
      if (error) throw error;
    }
    setData((current) => ({
      ...current,
      attachments: [...current.attachments, attachment],
    }));
    await recordActivity(`attached “${attachment.name}”`);
  }

  async function uploadFile(file: File) {
    const id = crypto.randomUUID();
    const path = `${task.id}/${id}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    let url = "#";
    if (!demoMode) {
      const supabase = createClient();
      const result = await supabase.storage
        .from("task-attachments")
        .upload(path, file);
      if (result.error) throw result.error;
      const signed = await supabase.storage
        .from("task-attachments")
        .createSignedUrl(path, 60 * 60);
      if (signed.error) throw signed.error;
      url = signed.data.signedUrl;
    }
    await addAttachment({
      id,
      task_id: task.id,
      name: file.name,
      url,
      file_path: demoMode ? null : path,
      mime_type: file.type || null,
      size_bytes: file.size,
      created_by: data.currentProfile.id,
      created_at: now(),
    });
  }

  async function uploadFiles(files: File[]) {
    if (uploadingFiles || files.length === 0) return;
    const validFiles = files.filter((file) => {
      if (file.size <= maxAttachmentSize) return true;
      toast.error(`${file.name} is larger than the 10 MB file limit.`);
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

  async function removeAttachment(item: TaskAttachment) {
    setData((current) => ({
      ...current,
      attachments: current.attachments.filter((entry) => entry.id !== item.id),
    }));
    if (!demoMode) {
      const supabase = createClient();
      if (item.file_path)
        await supabase.storage
          .from("task-attachments")
          .remove([item.file_path]);
      await supabase.from("task_attachments").delete().eq("id", item.id);
    }
  }

  const completed = subtasks.filter((item) => item.is_completed).length;

  return (
    <div
      className={`space-y-6 border-t border-black/10 pt-6 dark:border-white/10 ${className ?? ""}`}
    >
      <DisclosureCard
        defaultOpen
        className=""
        buttonClassName="flex w-full items-center justify-between gap-3 py-1 text-left"
        panelClassName="space-y-3 pt-3"
        iconClassName="h-3.5 w-3.5"
        summary={
          <span className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Checklist
            </span>
            <span className="text-xs text-black/50 dark:text-white/50">
              {completed}/{subtasks.length}
            </span>
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
                  label={`Delete ${item.title}`}
                  variant="danger"
                  onClick={() => void removeSubtask(item)}
                >
                  <FiTrash2 />
                </IconButton>
              </div>
            ))}
          </div>
        )}
        <div className="flex w-full gap-2">
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
          >
            Add
          </Button>
        </div>
      </DisclosureCard>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
          <FiPaperclip /> Attachments
        </h3>
        {attachments.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10"
          >
            <FiFile />
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-sm font-semibold underline-offset-2 hover:underline"
            >
              {item.name}
            </a>
            <IconButton
              label={`Remove ${item.name}`}
              variant="danger"
              onClick={() => void removeAttachment(item)}
            >
              <FiTrash2 />
            </IconButton>
          </div>
        ))}
        <div
          className={`rounded-xl border border-dashed p-4 text-center transition duration-200 ease-in-out ${
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
          <FiPaperclip className="mx-auto mb-2 h-5 w-5 text-black/45 dark:text-white/45" />
          <p className="text-sm font-semibold">Drop files here</p>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Multiple files supported · 10 MB maximum per file
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
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
            className="sr-only"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              void uploadFiles(files);
              event.target.value = "";
            }}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
          <FiMessageSquare /> Comment
        </h3>
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

      <DisclosureCard
        className=""
        buttonClassName="flex w-full items-center justify-between gap-3 py-1 text-left"
        panelClassName="space-y-3 pt-3"
        iconClassName="h-3.5 w-3.5"
        summary={
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
            Activity
            <span className="rounded-full bg-black/10 px-2 py-0.5 tracking-normal text-black/60 dark:bg-white/10 dark:text-white/60">
              {timeline.length}
            </span>
          </span>
        }
      >
        <div className="max-h-32 space-y-3 overflow-y-auto overscroll-contain pr-2">
          {timeline.map((item) => {
            const profile = data.profiles.find(
              (entry) =>
                entry.id ===
                (item.kind === "comment" ? item.created_by : item.actor_id),
            );
            return (
              <div
                key={`${item.kind}-${item.id}`}
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
                    {item.kind === "comment" ? item.body : item.action}
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
      </DisclosureCard>
    </div>
  );
}
