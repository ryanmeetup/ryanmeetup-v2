"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@ryanmeetup/ui";
import { MAX_ATTACHMENT_SIZE } from "@/lib/task-attachments";
import type { ResourceAttachment } from "@/lib/resource-types";
import type { ResourceAttachmentDraft } from "@/lib/resource-management";
import {
  appendAttachmentDraft,
  createFileDraft,
  createNoteDraft,
  moveAttachmentDraft,
  partitionAttachmentDrafts,
  removeAttachmentDraft,
  type ResourceKind,
} from "@/lib/resource-attachment-drafts";

export function useResourceAttachments({
  kind,
  resourceId,
  demoMode,
  currentUserId,
  draftState,
  onMutation,
}: {
  kind: ResourceKind;
  resourceId?: string;
  demoMode: boolean;
  currentUserId: string;
  draftState?: {
    drafts: ResourceAttachmentDraft[];
    onChange: (drafts: ResourceAttachmentDraft[]) => void;
  };
  onMutation?: () => void;
}) {
  const idKey = kind === "category" ? "categoryId" : "projectId";
  const endpoint = `/api/${kind}-attachments`;
  const [items, setItems] = useState<ResourceAttachmentDraft[]>(
    draftState?.drafts ?? [],
  );
  const [loading, setLoading] = useState(!demoMode && Boolean(resourceId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (demoMode || !resourceId) return;
    const controller = new AbortController();
    void fetch(`${endpoint}?${idKey}=${encodeURIComponent(resourceId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          attachments?: ResourceAttachment[];
          error?: string;
        };
        if (!response.ok) throw new Error(result.error);
        setItems(result.attachments ?? []);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error(`${kind === "project" ? "Project" : "Category"} attachments could not be loaded.`);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [demoMode, endpoint, idKey, kind, resourceId]);

  const updateItems = useCallback(
    (update: (current: ResourceAttachmentDraft[]) => ResourceAttachmentDraft[]) => {
      setItems((current) => {
        const next = update(current);
        draftState?.onChange(next);
        return next;
      });
    },
    [draftState],
  );

  async function addNote(name: string, body: string) {
    if (!name.trim() || !body.trim()) throw new Error("Add a title and some text for the note.");
    setSaving(true);
    try {
      let attachment = createNoteDraft({ kind, resourceId, currentUserId, name, body });
      if (!demoMode && resourceId) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [idKey]: resourceId, name: name.trim(), body: body.trim() }),
        });
        const result = (await response.json()) as { attachment?: ResourceAttachment; error?: string };
        if (!response.ok || !result.attachment) throw new Error(result.error ?? "The note could not be attached.");
        attachment = result.attachment;
      }
      updateItems((current) => appendAttachmentDraft(current, attachment));
      onMutation?.();
      toast.success("Note attached.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0 || saving) return;
    setSaving(true);
    let uploaded = 0;
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`${file.name} is larger than the 10 MB limit.`);
        continue;
      }
      try {
        let attachment = createFileDraft({
          kind,
          resourceId,
          currentUserId,
          file,
          retainFile: !resourceId,
        });
        if (!demoMode && resourceId) {
          const formData = new FormData();
          formData.set(idKey, resourceId);
          formData.set("file", file);
          const response = await fetch(endpoint, { method: "POST", body: formData });
          const result = (await response.json()) as { attachment?: ResourceAttachment; error?: string };
          if (!response.ok || !result.attachment) throw new Error(result.error ?? "The upload was rejected.");
          attachment = result.attachment;
        }
        updateItems((current) => appendAttachmentDraft(current, attachment));
        onMutation?.();
        uploaded += 1;
      } catch (error) {
        toast.error(error instanceof Error ? `${file.name}: ${error.message}` : `${file.name} could not be uploaded.`);
      }
    }
    setSaving(false);
    if (uploaded) toast.success(`${uploaded} ${uploaded === 1 ? "file" : "files"} attached.`);
  }

  async function remove(item: ResourceAttachmentDraft) {
    updateItems((current) => removeAttachmentDraft(current, item.id));
    if (demoMode || !resourceId) {
      onMutation?.();
      return;
    }
    try {
      const response = await fetch(`${endpoint}?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error);
      onMutation?.();
    } catch (error) {
      updateItems((current) => appendAttachmentDraft(current, item));
      toast.error(error instanceof Error ? error.message : "The attachment could not be removed.");
    }
  }

  async function move(
    item: ResourceAttachmentDraft,
    targetId: string | undefined,
    edge: "before" | "after",
  ) {
    const previous = items;
    const { drafts, sortOrder } = moveAttachmentDraft(items, item.id, targetId, edge);
    updateItems(() => drafts);
    if (demoMode || !resourceId) {
      onMutation?.();
      return;
    }
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [idKey]: resourceId, id: item.id, sortOrder }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error);
      onMutation?.();
    } catch (error) {
      updateItems(() => previous);
      toast.error(error instanceof Error ? error.message : "The attachment could not be reordered.");
    }
  }

  async function updateNote(item: ResourceAttachmentDraft, name: string, body: string) {
    if (!name.trim() || !body.trim()) throw new Error("Add a title and some text for the note.");
    const previous = items;
    const updated = { ...item, name: name.trim(), body: body.trim() };
    setSaving(true);
    updateItems((current) => current.map((candidate) => candidate.id === item.id ? updated : candidate));
    try {
      if (!demoMode && resourceId) {
        const response = await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [idKey]: resourceId, id: item.id, name: updated.name, body: updated.body }),
        });
        const result = (await response.json()) as { attachment?: ResourceAttachment; error?: string };
        if (!response.ok || !result.attachment) throw new Error(result.error ?? "The note could not be updated.");
        updateItems((current) => current.map((candidate) => candidate.id === item.id ? result.attachment! : candidate));
      }
      onMutation?.();
      toast.success("Note updated.");
    } catch (error) {
      updateItems(() => previous);
      throw error;
    } finally {
      setSaving(false);
    }
  }

  return { ...partitionAttachmentDrafts(items), loading, saving, addNote, updateNote, uploadFiles, remove, move };
}
