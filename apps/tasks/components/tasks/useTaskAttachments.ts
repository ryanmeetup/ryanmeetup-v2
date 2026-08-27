"use client";

import { useEffect, useState } from "react";
import { toast } from "@ryanmeetup/ui";
import { normalizeHttpUrl } from "@ryanmeetup/utils";
import { MAX_ATTACHMENT_SIZE } from "@/lib/tasks/task-attachments";
import { attachmentUrlName } from "@/lib/tasks/task-attachment-urls";
import {
  attachUrl,
  deleteAttachment,
  uploadAttachment,
  type AttachmentResult,
} from "@/lib/tasks/task-detail-mutations";
import { useWorkspaceWrite } from "@/hooks/useWorkspaceWrite";
import { errorMessage } from "@/lib/presentation";
import type { TaskAttachment } from "@/lib/tasks/task-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import type { TaskDetailContext } from "./task-detail-context";

/** Files the server accepted, plus the audit row it wrote for them. */
const withAttachment =
  (result: AttachmentResult) =>
  (current: WorkspaceData): WorkspaceData => ({
    ...current,
    attachments: [...current.attachments, result.attachment],
    activity: result.activity
      ? [result.activity, ...current.activity]
      : current.activity,
  });

export function useTaskAttachments({
  task,
  data,
  demoMode,
  setData,
  recordActivity,
  pasteEnabled,
}: TaskDetailContext & { pasteEnabled: boolean }) {
  const write = useWorkspaceWrite(setData);
  const [url, setUrl] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<TaskAttachment | null>(null);

  // A row with no file, type, size, or real URL is a stub the workspace keeps
  // for a task that has never had an attachment.
  const attachments = data.attachments.filter(
    (item) =>
      item.task_id === task.id &&
      (item.file_path ||
        item.mime_type ||
        item.size_bytes !== null ||
        item.url !== "#"),
  );

  async function addLocally(attachment: TaskAttachment) {
    setData((current) => ({
      ...current,
      attachments: [...current.attachments, attachment],
    }));
    await recordActivity(`attached “${attachment.name}”`);
  }

  async function uploadOne(file: File) {
    if (demoMode) {
      await addLocally({
        id: crypto.randomUUID(),
        task_id: task.id,
        name: file.name,
        url: "#",
        file_path: null,
        mime_type: file.type || null,
        size_bytes: file.size,
        created_by: data.currentProfile.id,
        created_at: new Date().toISOString(),
      });
      return;
    }
    setData(withAttachment(await uploadAttachment(task.id, file)));
  }

  async function upload(files: File[]) {
    if (uploading || files.length === 0) return;
    const valid = files.filter((file) => {
      if (file.size > 0 && file.size <= MAX_ATTACHMENT_SIZE) return true;
      toast.error(`${file.name} must be between 1 byte and 10 MB.`);
      return false;
    });
    if (valid.length === 0) return;

    setUploading(true);
    let uploaded = 0;
    for (const file of valid) {
      try {
        await uploadOne(file);
        uploaded += 1;
      } catch (error) {
        // Named per file, since the rest of the batch still goes through.
        toast.error(
          error instanceof Error
            ? `${file.name}: ${error.message}`
            : `${file.name} could not be uploaded.`,
        );
      }
    }
    setUploading(false);
    if (uploaded > 0)
      toast.success(
        `${uploaded} ${uploaded === 1 ? "file" : "files"} attached.`,
      );
  }

  async function addUrl() {
    const normalized = normalizeHttpUrl(url);
    if (!normalized) {
      toast.error("Enter a valid web address.");
      return;
    }
    if (attachments.some((item) => item.url === normalized)) {
      toast.error("That URL is already attached.");
      return;
    }

    setAddingUrl(true);
    try {
      if (demoMode) {
        await addLocally({
          id: crypto.randomUUID(),
          task_id: task.id,
          name: attachmentUrlName(normalized),
          url: normalized,
          file_path: null,
          mime_type: null,
          size_bytes: null,
          created_by: data.currentProfile.id,
          created_at: new Date().toISOString(),
        });
      } else {
        setData(withAttachment(await attachUrl(task.id, normalized)));
      }
      setUrl("");
      toast.success("URL attached.");
    } catch (error) {
      toast.error(errorMessage(error, "The URL could not be attached."));
    } finally {
      setAddingUrl(false);
    }
  }

  async function remove(item: TaskAttachment) {
    if (preview?.id === item.id) setPreview(null);
    await write({
      apply: (current) => ({
        ...current,
        attachments: current.attachments.filter(
          (entry) => entry.id !== item.id,
        ),
      }),
      revert: (current) => ({
        ...current,
        attachments: [...current.attachments, item],
      }),
      persist: demoMode ? undefined : () => deleteAttachment(item.id),
      whenFailed: "The attachment could not be removed.",
    });
  }

  // Pasting a file anywhere on an open task attaches it.
  useEffect(() => {
    if (!pasteEnabled) return;
    const handlePaste = (event: ClipboardEvent) => {
      if (uploading) return;
      const files = Array.from(event.clipboardData?.items ?? []).flatMap(
        (item) => {
          if (item.kind !== "file") return [];
          const file = item.getAsFile();
          return file ? [file] : [];
        },
      );
      if (files.length === 0) return;
      event.preventDefault();
      void upload(files);
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  });

  return {
    attachments,
    url,
    setUrl,
    addingUrl,
    uploading,
    preview,
    setPreview,
    upload,
    addUrl,
    remove,
  };
}
