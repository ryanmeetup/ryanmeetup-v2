import { NextResponse } from "next/server";
import { databaseFailure, logServerFailure } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import {
  detectAttachmentMimeType,
} from "@/lib/tasks/task-attachments";
import {
  attachmentResource,
  parseAttachmentReorder,
  parseNoteAttachmentUpdate,
  parseNoteAttachment,
  resourceFromDeletePath,
  validateAttachmentFile,
} from "@/lib/server/resource-attachment-request";
import {
  attachmentObjectPath,
  removeAttachmentObject,
  signAttachmentObject,
  uploadAttachmentObject,
} from "@/lib/server/resource-attachment-storage";
import {
  attachmentColumns,
  deleteAttachment,
  insertAttachment,
  updateAttachmentOrder,
  updateAttachmentNote,
} from "@/lib/server/resource-attachment-persistence";
import { recordWorkspaceActivity } from "@/lib/server/privileged-api";

type AttachmentRow = {
  id: string;
  project_id?: string;
  category_id?: string;
  kind: string;
  name: string;
  body: string | null;
  url: string;
  file_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_by: string;
  created_at: string;
  sort_order: number;
};

async function recordAttachmentActivity(
  supabase: Parameters<typeof canEditProject>[0],
  user: Parameters<typeof recordWorkspaceActivity>[0],
  resource: { kind: "project" | "category"; id: string },
  action: "add" | "delete" | "update",
  attachmentName: string,
) {
  const parent = await supabase
    .from(resource.kind === "category" ? "work_groups" : "projects")
    .select("name")
    .eq("id", resource.id)
    .single();
  if (parent.error) return false;
  return recordWorkspaceActivity(user, {
    action: `${resource.kind}.attachment.${action}`,
    targetType: resource.kind,
    targetId: resource.id,
    name: parent.data.name,
    href: resource.kind === "category" ? "/categories" : "/projects",
    projectId: resource.kind === "project" ? resource.id : null,
    metadata: { attachment_name: attachmentName },
  });
}

async function canEditProject(
  supabase: Awaited<ReturnType<typeof authorize>> extends infer T
    ? T extends { supabase: infer S }
      ? S
      : never
    : never,
  projectId: string,
) {
  const { data, error } = await supabase.rpc("can_edit_project", {
    project_id: projectId,
  });
  return !error && Boolean(data);
}

async function canEditCategory(supabase: Parameters<typeof canEditProject>[0]) {
  const { data, error } = await supabase.rpc("can_manage_categories");
  return !error && Boolean(data);
}

export async function GET(request: Request) {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const params = new URL(request.url).searchParams;
  const categoryId = params.get("categoryId");
  const projectId = params.get("projectId");
  const resource = attachmentResource(categoryId, projectId);
  if ("error" in resource)
    return NextResponse.json({ error: resource.error }, { status: resource.status });

  const { data, error } = await authorization.supabase
    .from(resource.table)
    .select(attachmentColumns(resource.foreignKey))
    .eq(resource.foreignKey, resource.id)
    .order("sort_order");
  if (error)
    return databaseFailure(request, "resource-attachment.list", error, {
      error: "Attachments could not be loaded.",
    });

  const attachments = (data ?? []) as unknown as AttachmentRow[];
  const paths = attachments.flatMap((item) =>
    item.file_path ? [item.file_path] : [],
  );
  const signed = paths.length
    ? await authorization.supabase.storage
        .from(resource.bucket)
        .createSignedUrls(paths, 3600)
    : { data: [] };
  const urls = new Map(
    (signed.data ?? []).flatMap((item) =>
      item.signedUrl ? [[item.path, item.signedUrl] as const] : [],
    ),
  );
  return NextResponse.json({
    attachments: attachments.map((item) => ({
      ...item,
      url: item.file_path ? (urls.get(item.file_path) ?? "") : "",
    })),
  });
}

export async function POST(request: Request) {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const { supabase, user } = authorization;
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const parsed = parseNoteAttachment(await request.json());
    if ("error" in parsed)
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const { resource, name, body: note } = parsed;
    if (
      !(resource.kind === "category"
        ? await canEditCategory(supabase)
        : await canEditProject(supabase, resource.id))
    )
      return NextResponse.json(
        {
          error: `You cannot edit this ${resource.kind}.`,
        },
        { status: 403 },
      );
    const { data, error } = await insertAttachment(supabase, resource, {
        [resource.foreignKey]: resource.id,
        kind: "note",
        name,
        body: note,
        created_by: user.id,
      });
    if (error)
      return databaseFailure(request, "resource-attachment.note", error, {
        error: "The note could not be attached.",
      });
    if (!(await recordAttachmentActivity(supabase, user, resource, "add", name)))
      return NextResponse.json(
        { error: "The note was attached, but its activity could not be recorded." },
        { status: 500 },
      );
    return NextResponse.json({ attachment: data });
  }

  const formData = await request.formData();
  const categoryId = formData.get("categoryId");
  const projectId = formData.get("projectId");
  const resource = attachmentResource(categoryId, projectId);
  const file = formData.get("file");
  if ("error" in resource)
    return NextResponse.json({ error: resource.error }, { status: resource.status });
  const validatedFile = validateAttachmentFile(file);
  if ("error" in validatedFile)
    return NextResponse.json({ error: validatedFile.error }, { status: validatedFile.status });
  if (
    !(resource.kind === "category"
      ? await canEditCategory(supabase)
      : await canEditProject(supabase, resource.id))
  )
    return NextResponse.json(
      {
        error: `You cannot edit this ${resource.kind}.`,
      },
      { status: 403 },
    );

  const bytes = new Uint8Array(await validatedFile.file.arrayBuffer());
  const mimeType = detectAttachmentMimeType(bytes);
  if (!mimeType)
    return NextResponse.json(
      { error: "Only PDF, JPEG, PNG, WebP, and plain-text files are allowed." },
      { status: 415 },
    );
  const id = crypto.randomUUID();
  const path = attachmentObjectPath(resource.id, id, validatedFile.file.name);
  const uploaded = await uploadAttachmentObject(resource.bucket, path, bytes, mimeType);
  if (uploaded.error)
    return databaseFailure(
      request,
      "resource-attachment.upload",
      uploaded.error,
      {
        error: "The file could not be uploaded.",
      },
    );

  const attachment = {
    id,
    [resource.foreignKey]: resource.id,
    kind: "file" as const,
    name: validatedFile.file.name,
    body: null,
    url: "",
    file_path: path,
    mime_type: mimeType,
    size_bytes: validatedFile.file.size,
    created_by: user.id,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(resource.table).insert(attachment);
  if (error) {
    const cleanup = await removeAttachmentObject(path, resource.bucket);
    return databaseFailure(request, "resource-attachment.record", error, {
      error: "The file could not be attached.",
      relatedFailures: { storageCleanup: cleanup },
    });
  }
  const signed = await signAttachmentObject(path, resource.bucket);
  if (signed.error) {
    await deleteAttachment(supabase, resource, id);
    await removeAttachmentObject(path, resource.bucket);
    return databaseFailure(request, "resource-attachment.sign", signed.error, {
      error: "The file was uploaded but could not be opened.",
    });
  }
  if (
    !(await recordAttachmentActivity(
      supabase,
      user,
      resource,
      "add",
      validatedFile.file.name,
    ))
  )
    return NextResponse.json(
      { error: "The file was attached, but its activity could not be recorded." },
      { status: 500 },
    );
  return NextResponse.json({
    attachment: { ...attachment, url: signed.data.signedUrl },
  });
}

export async function PATCH(request: Request) {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const { supabase } = authorization;
  const body = await request.json();
  const parsed = body && typeof body === "object" && ("name" in body || "body" in body)
    ? parseNoteAttachmentUpdate(body)
    : parseAttachmentReorder(body);
  if ("error" in parsed)
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { resource, id } = parsed;
  if (
    !(resource.kind === "category"
      ? await canEditCategory(supabase)
      : await canEditProject(supabase, resource.id))
  )
    return NextResponse.json(
      { error: `You cannot edit this ${resource.kind}.` },
      { status: 403 },
    );
  const noteUpdate = "name" in parsed;
  const { data, error } = noteUpdate
    ? await updateAttachmentNote(supabase, resource, id, { name: parsed.name, body: parsed.body })
    : await updateAttachmentOrder(supabase, resource, id, parsed.sortOrder);
  if (error)
    return databaseFailure(request, noteUpdate ? "resource-attachment.note-update" : "resource-attachment.reorder", error, {
      error: noteUpdate ? "The note could not be updated." : "The attachment could not be reordered.",
    });
  if (noteUpdate && !(await recordAttachmentActivity(supabase, authorization.user, resource, "update", parsed.name)))
    return NextResponse.json({ error: "The note was updated, but its activity could not be recorded." }, { status: 500 });
  return NextResponse.json({ attachment: data });
}

export async function DELETE(request: Request) {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const isCategory = new URL(request.url).pathname.includes(
    "category-attachments",
  );
  if (!id)
    return NextResponse.json(
      { error: "An attachment is required." },
      { status: 400 },
    );
  const { data, error } = await authorization.supabase
    .from(isCategory ? "category_attachments" : "project_attachments")
    .select(`id,${isCategory ? "category_id" : "project_id"},name,file_path`)
    .eq("id", id)
    .maybeSingle();
  if (error)
    return databaseFailure(request, "resource-attachment.lookup", error, {
      error: "The attachment could not be found.",
    });
  if (!data)
    return NextResponse.json(
      { error: "Attachment not found." },
      { status: 404 },
    );
  const parentId = (data as unknown as Record<string, unknown>)[isCategory ? "category_id" : "project_id"];
  const resource = resourceFromDeletePath(new URL(request.url).pathname, parentId);
  if ("error" in resource)
    return NextResponse.json({ error: resource.error }, { status: resource.status });
  if (
    !(isCategory
      ? await canEditCategory(authorization.supabase)
      : typeof parentId === "string" &&
        (await canEditProject(authorization.supabase, parentId)))
  )
    return NextResponse.json(
      { error: `You cannot edit this ${isCategory ? "category" : "project"}.` },
      { status: 403 },
    );
  const deleted = await deleteAttachment(authorization.supabase, resource, id);
  if (deleted.error)
    return databaseFailure(
      request,
      "resource-attachment.delete",
      deleted.error,
      {
        error: "The attachment could not be removed.",
      },
    );
  if (data.file_path) {
    const cleanup = await removeAttachmentObject(data.file_path, resource.bucket);
    if (cleanup)
      logServerFailure(request, "resource-attachment.cleanup", cleanup);
  }
  if (
    !(await recordAttachmentActivity(
      authorization.supabase,
      authorization.user,
      resource,
      "delete",
      data.name,
    ))
  )
    return NextResponse.json(
      { error: "The attachment was removed, but its activity could not be recorded." },
      { status: 500 },
    );
  return NextResponse.json({ deleted: true });
}
