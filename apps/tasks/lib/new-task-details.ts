import type { Dispatch, SetStateAction } from "react";
import type { NewTaskDetailsDraft } from "./task-types";
import type {
  Subtask,
  TaskAttachment,
  TaskComment,
} from "./task-types";
import type { TaskActivity } from "./activity-types";
import type { WorkspaceData } from "./workspace-types";
import { attachmentUrlName } from "./task-attachment-urls";
import { mutate } from "./mutation-client";

export async function persistNewTaskDetails({
  taskId,
  draft,
  demoMode,
  setData,
}: {
  taskId: string;
  draft: NewTaskDetailsDraft;
  demoMode: boolean;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
}) {
  if (demoMode) {
    const createdAt = new Date().toISOString();
    setData((current) => ({
      ...current,
      subtasks: [
        ...current.subtasks,
        ...draft.checklist.map((item, index) => ({
          id: item.id,
          task_id: taskId,
          title: item.title,
          is_completed: false,
          sort_order: index,
          created_by: current.currentProfile.id,
          created_at: createdAt,
        })),
      ],
      comments: draft.comment.trim()
        ? [
            ...current.comments,
            {
              id: crypto.randomUUID(),
              task_id: taskId,
              body: draft.comment.trim(),
              created_by: current.currentProfile.id,
              created_at: createdAt,
              edited_at: null,
            },
          ]
        : current.comments,
      attachments: [
        ...current.attachments,
        ...draft.files.map((file) => ({
          id: crypto.randomUUID(),
          task_id: taskId,
          name: file.name,
          url: "#",
          file_path: null,
          mime_type: file.type || null,
          size_bytes: file.size,
          created_by: current.currentProfile.id,
          created_at: createdAt,
        })),
        ...draft.urls.map((item) => ({
          id: item.id,
          task_id: taskId,
          name: attachmentUrlName(item.url),
          url: item.url,
          file_path: null,
          mime_type: null,
          size_bytes: null,
          created_by: current.currentProfile.id,
          created_at: createdAt,
        })),
      ],
    }));
    return 0;
  }

  let failures = 0;
  const subtasks: Subtask[] = [];
  const comments: TaskComment[] = [];
  const attachments: TaskAttachment[] = [];
  const activity: TaskActivity[] = [];
  for (const [index, item] of draft.checklist.entries()) {
    try {
      const result = await mutate<{
        subtask?: Subtask;
        activity?: TaskActivity;
      }>("/api/task-details", {
        method: "POST",
        body: JSON.stringify({
          kind: "subtask",
          taskId,
          value: item.title,
          sortOrder: index,
        }),
      });
      if (!result.subtask) failures += 1;
      else {
        subtasks.push(result.subtask);
        if (result.activity) activity.push(result.activity);
      }
    } catch {
      failures += 1;
    }
  }
  if (draft.comment.trim()) {
    try {
      const result = await mutate<{ comment?: TaskComment }>(
        "/api/task-details",
        {
          method: "POST",
          body: JSON.stringify({
            kind: "comment",
            taskId,
            value: draft.comment.trim(),
          }),
        },
      );
      if (!result.comment) failures += 1;
      else comments.push(result.comment);
    } catch {
      failures += 1;
    }
  }
  for (const file of draft.files) {
    try {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("file", file);
      const result = await mutate<{
        attachment?: TaskAttachment;
        activity?: TaskActivity;
      }>("/api/task-attachments", {
        method: "POST",
        body: formData,
      });
      if (!result.attachment) failures += 1;
      else {
        attachments.push(result.attachment);
        if (result.activity) activity.push(result.activity);
      }
    } catch {
      failures += 1;
    }
  }
  for (const item of draft.urls) {
    try {
      const result = await mutate<{
        attachment?: TaskAttachment;
        activity?: TaskActivity;
      }>("/api/task-attachments", {
        method: "POST",
        body: JSON.stringify({ taskId, url: item.url }),
      });
      if (!result.attachment) failures += 1;
      else {
        attachments.push(result.attachment);
        if (result.activity) activity.push(result.activity);
      }
    } catch {
      failures += 1;
    }
  }
  setData((current) => ({
    ...current,
    subtasks: [...current.subtasks, ...subtasks],
    comments: [...current.comments, ...comments],
    attachments: [...current.attachments, ...attachments],
    activity: [...activity, ...current.activity],
  }));
  return failures;
}
