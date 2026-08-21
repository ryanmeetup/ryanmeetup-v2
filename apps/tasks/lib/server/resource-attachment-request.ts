import { MAX_ATTACHMENT_SIZE } from "@/lib/tasks/task-attachments";

export type AttachmentResource = {
  kind: "category" | "project";
  id: string;
  table: "category_attachments" | "project_attachments";
  foreignKey: "category_id" | "project_id";
  bucket: "category-attachments" | "project-attachments";
};

export type AttachmentRequestError = { error: string; status: number };

export function attachmentResource(
  categoryId: unknown,
  projectId: unknown,
): AttachmentResource | AttachmentRequestError {
  const category = typeof categoryId === "string" ? categoryId.trim() : "";
  const project = typeof projectId === "string" ? projectId.trim() : "";
  if ((category && project) || (!category && !project))
    return {
      error: "Exactly one project or category is required.",
      status: 400,
    };
  return category
    ? {
        kind: "category",
        id: category,
        table: "category_attachments",
        foreignKey: "category_id",
        bucket: "category-attachments",
      }
    : {
        kind: "project",
        id: project,
        table: "project_attachments",
        foreignKey: "project_id",
        bucket: "project-attachments",
      };
}

export function parseNoteAttachment(input: unknown) {
  if (!input || typeof input !== "object")
    return { error: "Add a title and note.", status: 400 } as const;
  const body = input as Record<string, unknown>;
  const resource = attachmentResource(body.categoryId, body.projectId);
  if ("error" in resource) return resource;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const note = typeof body.body === "string" ? body.body.trim() : "";
  if (!name || name.length > 200 || !note || note.length > 10000)
    return { error: "Add a title and note.", status: 400 } as const;
  return { resource, name, body: note };
}

export function validateAttachmentFile(file: unknown) {
  if (!(file instanceof File))
    return { error: "A file is required.", status: 400 } as const;
  if (file.size === 0 || file.size > MAX_ATTACHMENT_SIZE)
    return {
      error: "Files must be between 1 byte and 10 MB.",
      status: 413,
    } as const;
  return { file };
}

export function parseAttachmentReorder(input: unknown) {
  if (!input || typeof input !== "object")
    return { error: "An attachment and position are required.", status: 400 } as const;
  const body = input as Record<string, unknown>;
  const resource = attachmentResource(body.categoryId, body.projectId);
  if ("error" in resource) return resource;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const sortOrder =
    typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
      ? body.sortOrder
      : null;
  if (!id || sortOrder === null)
    return { error: "An attachment and position are required.", status: 400 } as const;
  return { resource, id, sortOrder };
}

export function parseNoteAttachmentUpdate(input: unknown) {
  if (!input || typeof input !== "object")
    return { error: "A note and its changes are required.", status: 400 } as const;
  const body = input as Record<string, unknown>;
  const resource = attachmentResource(body.categoryId, body.projectId);
  if ("error" in resource) return resource;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const note = typeof body.body === "string" ? body.body.trim() : "";
  if (!id || !name || name.length > 200 || !note || note.length > 10000)
    return { error: "Add a title and note.", status: 400 } as const;
  return { resource, id, name, body: note };
}

export function resourceFromDeletePath(pathname: string, parentId: unknown) {
  return pathname.includes("category-attachments")
    ? attachmentResource(parentId, undefined)
    : attachmentResource(undefined, parentId);
}
