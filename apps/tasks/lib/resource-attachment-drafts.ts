import type {
  ResourceAttachment,
  ResourceLink,
} from "@/lib/resource-types";
import type { ResourceAttachmentDraft } from "@/lib/resource-management";

export type ResourceKind = "category" | "project";

export function partitionAttachmentDrafts(drafts: ResourceAttachmentDraft[]) {
  return {
    notes: drafts.filter((draft) => draft.kind === "note"),
    files: drafts.filter((draft) => draft.kind === "file"),
  };
}

export function appendAttachmentDraft(
  drafts: ResourceAttachmentDraft[],
  draft: ResourceAttachmentDraft,
) {
  return [...drafts, draft];
}

export function removeAttachmentDraft(
  drafts: ResourceAttachmentDraft[],
  id: string,
) {
  return drafts.filter((draft) => draft.id !== id);
}

export function createNoteDraft({
  kind,
  resourceId = "",
  currentUserId,
  name,
  body,
}: {
  kind: ResourceKind;
  resourceId?: string;
  currentUserId: string;
  name: string;
  body: string;
}): ResourceAttachmentDraft {
  return {
    id: crypto.randomUUID(),
    ...(kind === "category"
      ? { category_id: resourceId }
      : { project_id: resourceId }),
    kind: "note",
    name: name.trim(),
    body: body.trim(),
    url: "",
    file_path: null,
    mime_type: null,
    size_bytes: null,
    created_by: currentUserId,
    created_at: new Date().toISOString(),
  };
}

export function createFileDraft({
  kind,
  resourceId = "",
  currentUserId,
  file,
  retainFile,
}: {
  kind: ResourceKind;
  resourceId?: string;
  currentUserId: string;
  file: File;
  retainFile: boolean;
}): ResourceAttachmentDraft {
  return {
    id: crypto.randomUUID(),
    ...(kind === "category"
      ? { category_id: resourceId }
      : { project_id: resourceId }),
    kind: "file",
    name: file.name,
    body: null,
    url: "#",
    file_path: null,
    mime_type: file.type || null,
    size_bytes: file.size,
    created_by: currentUserId,
    created_at: new Date().toISOString(),
    ...(retainFile ? { file } : {}),
  };
}

export function isResourceAttachment(value: unknown): value is ResourceAttachment {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ResourceAttachment>;
  return (
    typeof item.id === "string" &&
    (item.kind === "note" || item.kind === "file") &&
    typeof item.name === "string"
  );
}

export function normalizeResourceLinks(links: ResourceLink[]) {
  return links.map((link) => ({
    label: link.label.trim(),
    url: link.url.trim(),
  }));
}
