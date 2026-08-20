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

export function moveAttachmentDraft(
  drafts: ResourceAttachmentDraft[],
  id: string,
  targetId: string | undefined,
  edge: "before" | "after",
) {
  const moving = drafts.find((draft) => draft.id === id);
  if (!moving || moving.id === targetId)
    return { drafts, sortOrder: moving?.sort_order ?? 0 };
  const siblings = drafts
    .filter((draft) => draft.kind === moving.kind && draft.id !== id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const index = targetId
    ? siblings.findIndex((draft) => draft.id === targetId)
    : -1;
  let sortOrder = (siblings.at(-1)?.sort_order ?? 0) + 1024;
  if (index >= 0 && edge === "before") {
    sortOrder = siblings[index - 1]
      ? (siblings[index - 1].sort_order + siblings[index].sort_order) / 2
      : siblings[index].sort_order - 1024;
  } else if (index >= 0) {
    sortOrder = siblings[index + 1]
      ? (siblings[index].sort_order + siblings[index + 1].sort_order) / 2
      : siblings[index].sort_order + 1024;
  }
  const next = drafts.map((draft) =>
    draft.id === id ? { ...draft, sort_order: sortOrder } : draft,
  );
  return { drafts: next, sortOrder };
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
    sort_order: Date.now(),
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
    sort_order: Date.now(),
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
