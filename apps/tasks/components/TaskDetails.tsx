"use client";

import {
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Button, Input, Textarea } from "@ryanmeetup/ui";
import {
  FiCheck,
  FiFile,
  FiLink,
  FiMessageSquare,
  FiPaperclip,
  FiPlus,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import type {
  Label,
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

export function TaskDetails({
  className,
  data,
  demoMode,
  setData,
  task,
}: TaskDetailsProps) {
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [comment, setComment] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#4f46e5");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtasks = data.subtasks.filter((item) => item.task_id === task.id);
  const attachments = data.attachments.filter(
    (item) => item.task_id === task.id,
  );
  const assigneeIds = new Set(
    data.taskAssignees
      .filter((item) => item.task_id === task.id)
      .map((item) => item.profile_id),
  );
  if (task.assignee_id) assigneeIds.add(task.assignee_id);
  const labelIds = new Set(
    data.taskLabels
      .filter((item) => item.task_id === task.id)
      .map((item) => item.label_id),
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
    setData((current) => ({
      ...current,
      attachments: [...current.attachments, attachment],
    }));
    if (!demoMode)
      await createClient().from("task_attachments").insert(attachment);
    await recordActivity(`attached “${attachment.name}”`);
  }

  async function addLink() {
    const rawUrl = linkUrl.trim();
    if (!rawUrl) return;
    let url: string;
    try {
      url = new URL(rawUrl).toString();
    } catch {
      return;
    }
    await addAttachment({
      id: crypto.randomUUID(),
      task_id: task.id,
      name: linkName.trim() || new URL(url).hostname,
      url,
      file_path: null,
      mime_type: null,
      size_bytes: null,
      created_by: data.currentProfile.id,
      created_at: now(),
    });
    setLinkName("");
    setLinkUrl("");
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
      if (result.error) return;
      const signed = await supabase.storage
        .from("task-attachments")
        .createSignedUrl(path, 60 * 60);
      if (signed.error) return;
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

  async function toggleAssignee(profileId: string) {
    const selected = assigneeIds.has(profileId);
    setData((current) => ({
      ...current,
      taskAssignees: selected
        ? current.taskAssignees.filter(
            (item) => item.task_id !== task.id || item.profile_id !== profileId,
          )
        : [
            ...current.taskAssignees,
            { task_id: task.id, profile_id: profileId },
          ],
    }));
    if (!demoMode) {
      const query = createClient().from("task_assignees");
      if (selected)
        await query.delete().eq("task_id", task.id).eq("profile_id", profileId);
      else await query.insert({ task_id: task.id, profile_id: profileId });
    }
    await recordActivity(`${selected ? "removed" : "added"} a collaborator`);
  }

  async function toggleLabel(labelId: string) {
    const selected = labelIds.has(labelId);
    setData((current) => ({
      ...current,
      taskLabels: selected
        ? current.taskLabels.filter(
            (item) => item.task_id !== task.id || item.label_id !== labelId,
          )
        : [...current.taskLabels, { task_id: task.id, label_id: labelId }],
    }));
    if (!demoMode) {
      const query = createClient().from("task_labels");
      if (selected)
        await query.delete().eq("task_id", task.id).eq("label_id", labelId);
      else await query.insert({ task_id: task.id, label_id: labelId });
    }
  }

  async function createLabel() {
    const name = labelName.trim();
    if (!name) return;
    const label: Label = {
      id: crypto.randomUUID(),
      name,
      color: labelColor,
      created_by: data.currentProfile.id,
    };
    setData((current) => ({ ...current, labels: [...current.labels, label] }));
    setLabelName("");
    if (!demoMode) await createClient().from("labels").insert(label);
    await toggleLabel(label.id);
  }

  const completed = subtasks.filter((item) => item.is_completed).length;

  return (
    <div
      className={`space-y-6 border-t border-black/10 pt-6 dark:border-white/10 ${className ?? ""}`}
    >
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em]">
            Checklist
          </h3>
          <span className="text-xs text-black/50 dark:text-white/50">
            {completed}/{subtasks.length}
          </span>
        </div>
        {subtasks.length > 0 && (
          <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(completed / subtasks.length) * 100}%` }}
            />
          </div>
        )}
        {subtasks.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <button
              type="button"
              aria-label={`${item.is_completed ? "Reopen" : "Complete"} ${item.title}`}
              onClick={() => void toggleSubtask(item)}
              className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${item.is_completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-black/20 dark:border-white/25"}`}
            >
              {item.is_completed && <FiCheck aria-hidden />}
            </button>
            <span
              className={`min-w-0 flex-1 text-sm ${item.is_completed ? "text-black/45 line-through dark:text-white/45" : ""}`}
            >
              {item.title}
            </span>
            <button
              type="button"
              aria-label={`Delete ${item.title}`}
              onClick={() => void removeSubtask(item)}
              className="p-1 text-black/40 hover:text-red-600 dark:text-white/40"
            >
              <FiTrash2 />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
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
          <Button
            type="button"
            variant="action"
            leftIcon={<FiPlus />}
            onClick={() => void addSubtask()}
          >
            Add
          </Button>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
            <FiUsers /> Collaborators
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                disabled={profile.id === task.assignee_id}
                aria-pressed={assigneeIds.has(profile.id)}
                onClick={() => void toggleAssignee(profile.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-default ${assigneeIds.has(profile.id) ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"}`}
              >
                {profile.full_name}
                {profile.id === task.assignee_id ? " · Owner" : ""}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em]">
            Labels
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.labels.map((label) => (
              <button
                key={label.id}
                type="button"
                aria-pressed={labelIds.has(label.id)}
                onClick={() => void toggleLabel(label.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${labelIds.has(label.id) ? "text-white ring-2 ring-black/20 dark:ring-white/30" : "opacity-55"}`}
                style={{
                  backgroundColor: label.color,
                  borderColor: label.color,
                }}
              >
                {label.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-2">
            <Input
              label="New label"
              hideLabel
              name="new-label"
              value={labelName}
              onChange={(event) => setLabelName(event.target.value)}
              placeholder="New label…"
            />
            <input
              aria-label="Label color"
              type="color"
              value={labelColor}
              onChange={(event) => setLabelColor(event.target.value)}
              className="color-input h-10 w-10 rounded-lg border border-black/10 dark:border-white/10"
            />
            <Button
              type="button"
              variant="action"
              onClick={() => void createLabel()}
            >
              Add
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
          <FiPaperclip /> Attachments & links
        </h3>
        {attachments.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10"
          >
            {item.file_path ? <FiFile /> : <FiLink />}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-sm font-semibold underline-offset-2 hover:underline"
            >
              {item.name}
            </a>
            <button
              type="button"
              aria-label={`Remove ${item.name}`}
              onClick={() => void removeAttachment(item)}
              className="p-1 text-black/40 hover:text-red-600 dark:text-white/40"
            >
              <FiTrash2 />
            </button>
          </div>
        ))}
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            label="Link name"
            name="link-name"
            value={linkName}
            onChange={(event) => setLinkName(event.target.value)}
            placeholder="Optional label"
          />
          <Input
            label="URL"
            name="link-url"
            type="url"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="action"
            leftIcon={<FiLink />}
            onClick={() => void addLink()}
          >
            Add link
          </Button>
          <Button
            type="button"
            variant="action"
            leftIcon={<FiPaperclip />}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload file
          </Button>
          <input
            ref={fileInputRef}
            aria-label="Upload task attachment"
            type="file"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadFile(file);
              event.target.value = "";
            }}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
          <FiMessageSquare /> Comments & activity
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
        <Button
          type="button"
          variant="action"
          onClick={() => void addComment()}
        >
          Comment
        </Button>
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {timeline.map((item) => {
            const profile = data.profiles.find(
              (entry) =>
                entry.id ===
                (item.kind === "comment" ? item.created_by : item.actor_id),
            );
            return (
              <div
                key={`${item.kind}-${item.id}`}
                className="border-l-2 border-black/10 pl-3 text-sm dark:border-white/10"
              >
                <p>
                  <strong>{profile?.full_name ?? "A teammate"}</strong>{" "}
                  {item.kind === "comment" ? item.body : item.action}
                </p>
                <time className="text-xs text-black/45 dark:text-white/45">
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(item.created_at))}
                </time>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
