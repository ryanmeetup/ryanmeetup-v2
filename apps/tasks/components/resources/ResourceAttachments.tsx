"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  DisclosureCard,
  IconButton,
  Input,
  Textarea,
  toast,
} from "@ryanmeetup/ui";
import {
  FiExternalLink,
  FiFile,
  FiFileText,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { MAX_ATTACHMENT_SIZE } from "@/lib/task-attachments";
import { CountBadge } from "@/components/global";
import type { CategoryAttachment, ProjectAttachment } from "@/lib/types";
import { formatFileSize } from "@/lib/presentation";
import type { ResourceAttachmentDraft } from "@/lib/resource-management";

type ResourceAttachment = ProjectAttachment | CategoryAttachment;

export function ResourceAttachments({
  resource,
  editor,
  draftState,
}: {
  resource: { kind: "project" | "category"; id?: string };
  editor: { demoMode: boolean; disabled: boolean; currentUserId: string };
  draftState?: {
    drafts: ResourceAttachmentDraft[];
    onChange: (drafts: ResourceAttachmentDraft[]) => void;
  };
}) {
  const { kind, id: resourceId } = resource;
  const { demoMode, disabled, currentUserId } = editor;
  const idKey = kind === "category" ? "categoryId" : "projectId";
  const endpoint = `/api/${kind}-attachments`;
  const [items, setItems] = useState<ResourceAttachmentDraft[]>(
    draftState?.drafts ?? [],
  );
  const [loading, setLoading] = useState(!demoMode && Boolean(resourceId));
  const [saving, setSaving] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

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
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        toast.error(
          `${kind === "project" ? "Project" : "Category"} attachments could not be loaded.`,
        );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [demoMode, endpoint, idKey, kind, resourceId]);

  function updateItems(
    update: (current: ResourceAttachmentDraft[]) => ResourceAttachmentDraft[],
  ) {
    setItems((current) => {
      const next = update(current);
      draftState?.onChange(next);
      return next;
    });
  }

  async function addNote() {
    const name = noteTitle.trim();
    const body = noteBody.trim();
    if (!name || !body) {
      toast.error("Add a title and some text for the note.");
      return;
    }
    setSaving(true);
    try {
      let attachment: ResourceAttachmentDraft = {
        id: crypto.randomUUID(),
        ...(kind === "category"
          ? { category_id: resourceId ?? "" }
          : { project_id: resourceId ?? "" }),
        kind: "note",
        name,
        body,
        url: "",
        file_path: null,
        mime_type: null,
        size_bytes: null,
        created_by: currentUserId,
        created_at: new Date().toISOString(),
      };
      if (!demoMode && resourceId) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [idKey]: resourceId, name, body }),
        });
        const result = (await response.json()) as {
          attachment?: ResourceAttachment;
          error?: string;
        };
        if (!response.ok || !result.attachment)
          throw new Error(result.error ?? "The note could not be attached.");
        attachment = result.attachment;
      }
      updateItems((current) => [...current, attachment]);
      setNoteTitle("");
      setNoteBody("");
      setNoteOpen(false);
      toast.success("Note attached.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The note could not be attached.",
      );
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
        let attachment: ResourceAttachmentDraft = {
          id: crypto.randomUUID(),
          ...(kind === "category"
            ? { category_id: resourceId ?? "" }
            : { project_id: resourceId ?? "" }),
          kind: "file",
          name: file.name,
          body: null,
          url: "#",
          file_path: null,
          mime_type: file.type || null,
          size_bytes: file.size,
          created_by: currentUserId,
          created_at: new Date().toISOString(),
        };
        if (!demoMode && resourceId) {
          const formData = new FormData();
          formData.set(idKey, resourceId);
          formData.set("file", file);
          const response = await fetch(endpoint, {
            method: "POST",
            body: formData,
          });
          const result = (await response.json()) as {
            attachment?: ResourceAttachment;
            error?: string;
          };
          if (!response.ok || !result.attachment)
            throw new Error(result.error ?? "The upload was rejected.");
          attachment = result.attachment;
        }
        if (!resourceId) attachment.file = file;
        updateItems((current) => [...current, attachment]);
        uploaded += 1;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? `${file.name}: ${error.message}`
            : `${file.name} could not be uploaded.`,
        );
      }
    }
    setSaving(false);
    if (uploaded)
      toast.success(
        `${uploaded} ${uploaded === 1 ? "file" : "files"} attached.`,
      );
  }

  async function remove(item: ResourceAttachment) {
    updateItems((current) =>
      current.filter((candidate) => candidate.id !== item.id),
    );
    if (demoMode || !resourceId) return;
    try {
      const response = await fetch(
        `${endpoint}?id=${encodeURIComponent(item.id)}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error);
    } catch (error) {
      updateItems((current) => [...current, item]);
      toast.error(
        error instanceof Error
          ? error.message
          : "The attachment could not be removed.",
      );
    }
  }

  const notes = items.filter((item) => item.kind === "note");
  const files = items.filter((item) => item.kind === "file");

  return (
    <div className="space-y-4">
      <DisclosureCard
        defaultOpen
        collapsible={notes.length > 0 || noteOpen}
        className="rounded-xl border border-black/10 bg-black/[0.015] p-3 dark:border-white/10 dark:bg-white/[0.025]"
        buttonClassName="flex w-fit items-center gap-2 text-left"
        panelClassName="pt-3"
        iconClassName="h-3.5 w-3.5"
        description={
          <p className="pr-2 text-xs leading-relaxed text-black/55 dark:text-white/55">
            Keep useful context with the {kind}.
          </p>
        }
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<FiPlus aria-hidden />}
            className="shrink-0 px-3 py-1.5 normal-case tracking-normal"
            disabled={disabled || saving}
            onClick={() => setNoteOpen((open) => !open)}
          >
            Add note
          </Button>
        }
        summary={
          <span className="flex items-center gap-2 text-sm font-semibold">
            Notes
            {notes.length > 0 && <CountBadge>{notes.length}</CountBadge>}
          </span>
        }
      >
        {noteOpen && (
          <div className="space-y-3 rounded-lg border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-black/10">
            <Input
              label="Note title"
              name={`${kind}-note-title-${resourceId}`}
              value={noteTitle}
              maxLength={200}
              disabled={saving}
              onChange={(event) => setNoteTitle(event.target.value)}
            />
            <Textarea
              id={`${kind}-note-body-${resourceId}`}
              label="Note"
              name={`${kind}-note-body-${resourceId}`}
              value={noteBody}
              maxLength={10000}
              rows={4}
              disabled={saving}
              onChange={(event) => setNoteBody(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={saving}
                onClick={() => setNoteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                loading={saving}
                loadingText="Saving..."
                onClick={() => void addNote()}
              >
                Save note
              </Button>
            </div>
          </div>
        )}

        <div
          className={notes.length > 0 ? "space-y-2" : undefined}
          aria-busy={loading}
        >
          {loading && (
            <p className="text-xs text-black/55 dark:text-white/55">
              Loading notes...
            </p>
          )}
          {notes.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-black/10"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/5 text-black/55 dark:bg-white/5 dark:text-white/55">
                <FiFileText aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.name}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-black/65 dark:text-white/65">
                  {item.body}
                </p>
              </div>
              <IconButton
                type="button"
                label={`Remove “${item.name}”`}
                variant="danger"
                disabled={disabled || saving}
                onClick={() => void remove(item)}
              >
                <FiTrash2 />
              </IconButton>
            </div>
          ))}
        </div>
      </DisclosureCard>

      <DisclosureCard
        defaultOpen
        collapsible={files.length > 0}
        className="rounded-xl border border-black/10 bg-black/[0.015] p-3 dark:border-white/10 dark:bg-white/[0.025]"
        buttonClassName="flex w-fit items-center gap-2 text-left"
        panelClassName="pt-3"
        iconClassName="h-3.5 w-3.5"
        description={
          <p className="pr-2 text-xs leading-relaxed text-black/55 dark:text-white/55">
            Add photos, PDFs, or text files. 10 MB maximum per file.
          </p>
        }
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<FiPlus aria-hidden />}
            className="shrink-0 px-3 py-1.5 normal-case tracking-normal"
            loading={saving}
            disabled={disabled}
            onClick={() => fileInput.current?.click()}
          >
            Add files
          </Button>
        }
        summary={
          <span className="flex items-center gap-2 text-sm font-semibold">
            Attachments
            {files.length > 0 && <CountBadge>{files.length}</CountBadge>}
          </span>
        }
      >
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".pdf,.txt,image/jpeg,image/png,image/webp"
          aria-label={`Upload ${kind} attachments`}
          className="sr-only"
          onChange={(event) => {
            void uploadFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />

        <div
          className={files.length > 0 ? "space-y-2" : undefined}
          aria-busy={loading}
        >
          {loading && (
            <p className="text-xs text-black/55 dark:text-white/55">
              Loading attachments...
            </p>
          )}
          {files.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-black/10"
            >
              {item.mime_type?.startsWith("image/") && item.url !== "#" ? (
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-black/5 dark:bg-white/5">
                  <Image
                    src={item.url}
                    alt=""
                    fill
                    unoptimized
                    sizes="48px"
                    className="object-cover"
                  />
                </span>
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/5 text-black/55 dark:bg-white/5 dark:text-white/55">
                  <FiFile aria-hidden />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.name}</p>
                <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                  {formatFileSize(item.size_bytes) || "File"}
                </p>
              </div>
              {item.url !== "#" && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${item.name} in a new tab`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:bg-white/10 dark:focus-visible:ring-white/30"
                >
                  <FiExternalLink aria-hidden />
                </a>
              )}
              <IconButton
                type="button"
                label={`Remove “${item.name}”`}
                variant="danger"
                disabled={disabled || saving}
                onClick={() => void remove(item)}
              >
                <FiTrash2 />
              </IconButton>
            </div>
          ))}
        </div>
      </DisclosureCard>
    </div>
  );
}
