import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server/admin-client";
import { databaseFailure, logServerFailure } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import {
  detectAttachmentMimeType,
  MAX_ATTACHMENT_SIZE,
} from "@/lib/task-attachments";

const attachmentColumns = (foreignKey: "project_id" | "category_id") =>
  `id,${foreignKey},kind,name,body,url,file_path,mime_type,size_bytes,created_by,created_at`;

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
};

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
  const { data, error } = await supabase.rpc("is_app_owner");
  return !error && Boolean(data);
}

async function removeObject(path: string, bucket = "project-attachments") {
  const admin = getAdminClient();
  if (!admin) return new Error("Attachment storage cleanup is unavailable.");
  const { error } = await admin.storage.from(bucket).remove([path]);
  return error;
}

export async function GET(request: Request) {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const params = new URL(request.url).searchParams;
  const categoryId = params.get("categoryId");
  const projectId = params.get("projectId");
  const resourceId = categoryId ?? projectId;
  const table = categoryId ? "category_attachments" : "project_attachments";
  const foreignKey = categoryId ? "category_id" : "project_id";
  const bucket = categoryId ? "category-attachments" : "project-attachments";
  if (!resourceId)
    return NextResponse.json(
      { error: "A project or category is required." },
      { status: 400 },
    );

  const { data, error } = await authorization.supabase
    .from(table)
    .select(attachmentColumns(foreignKey))
    .eq(foreignKey, resourceId)
    .order("created_at");
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
        .from(bucket)
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
    const body = (await request.json()) as {
      projectId?: string;
      categoryId?: string;
      name?: string;
      body?: string;
    };
    const categoryId = body.categoryId;
    const projectId = body.projectId;
    const resourceId = categoryId ?? projectId;
    const table = categoryId ? "category_attachments" : "project_attachments";
    const foreignKey = categoryId ? "category_id" : "project_id";
    const name = body.name?.trim();
    const note = body.body?.trim();
    if (
      !resourceId ||
      !name ||
      name.length > 200 ||
      !note ||
      note.length > 10000
    )
      return NextResponse.json(
        { error: "Add a title and note." },
        { status: 400 },
      );
    if (
      !(categoryId
        ? await canEditCategory(supabase)
        : await canEditProject(supabase, projectId!))
    )
      return NextResponse.json(
        {
          error: `You cannot edit this ${categoryId ? "category" : "project"}.`,
        },
        { status: 403 },
      );
    const { data, error } = await supabase
      .from(table)
      .insert({
        [foreignKey]: resourceId,
        kind: "note",
        name,
        body: note,
        created_by: user.id,
      })
      .select(attachmentColumns(foreignKey))
      .single();
    if (error)
      return databaseFailure(request, "resource-attachment.note", error, {
        error: "The note could not be attached.",
      });
    return NextResponse.json({ attachment: data });
  }

  const formData = await request.formData();
  const categoryId = formData.get("categoryId");
  const projectId = formData.get("projectId");
  const resourceId = typeof categoryId === "string" ? categoryId : projectId;
  const table =
    typeof categoryId === "string"
      ? "category_attachments"
      : "project_attachments";
  const foreignKey =
    typeof categoryId === "string" ? "category_id" : "project_id";
  const bucket =
    typeof categoryId === "string"
      ? "category-attachments"
      : "project-attachments";
  const file = formData.get("file");
  if (typeof resourceId !== "string" || !(file instanceof File))
    return NextResponse.json(
      { error: "A project or category and file are required." },
      { status: 400 },
    );
  if (file.size === 0 || file.size > MAX_ATTACHMENT_SIZE)
    return NextResponse.json(
      { error: "Files must be between 1 byte and 10 MB." },
      { status: 413 },
    );
  if (
    !(typeof categoryId === "string"
      ? await canEditCategory(supabase)
      : await canEditProject(supabase, resourceId))
  )
    return NextResponse.json(
      {
        error: `You cannot edit this ${typeof categoryId === "string" ? "category" : "project"}.`,
      },
      { status: 403 },
    );

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectAttachmentMimeType(bytes);
  if (!mimeType)
    return NextResponse.json(
      { error: "Only PDF, JPEG, PNG, WebP, and plain-text files are allowed." },
      { status: 415 },
    );
  const admin = getAdminClient();
  if (!admin)
    return NextResponse.json(
      { error: "Attachment uploads are unavailable." },
      { status: 503 },
    );

  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${resourceId}/${id}-${safeName}`;
  const uploaded = await admin.storage
    .from(bucket)
    .upload(path, bytes, { contentType: mimeType, upsert: false });
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
    [foreignKey]: resourceId,
    kind: "file" as const,
    name: file.name,
    body: null,
    url: "",
    file_path: path,
    mime_type: mimeType,
    size_bytes: file.size,
    created_by: user.id,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(table).insert(attachment);
  if (error) {
    const cleanup = await removeObject(path, bucket);
    return databaseFailure(request, "resource-attachment.record", error, {
      error: "The file could not be attached.",
      relatedFailures: { storageCleanup: cleanup },
    });
  }
  const signed = await admin.storage.from(bucket).createSignedUrl(path, 3600);
  if (signed.error) {
    await supabase.from(table).delete().eq("id", id);
    await removeObject(path, bucket);
    return databaseFailure(request, "resource-attachment.sign", signed.error, {
      error: "The file was uploaded but could not be opened.",
    });
  }
  return NextResponse.json({
    attachment: { ...attachment, url: signed.data.signedUrl },
  });
}

export async function DELETE(request: Request) {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const isCategory = new URL(request.url).pathname.includes(
    "category-attachments",
  );
  const table = isCategory ? "category_attachments" : "project_attachments";
  const foreignKey = isCategory ? "category_id" : "project_id";
  const bucket = isCategory ? "category-attachments" : "project-attachments";
  if (!id)
    return NextResponse.json(
      { error: "An attachment is required." },
      { status: 400 },
    );
  const { data, error } = await authorization.supabase
    .from(table)
    .select(`id,${foreignKey},file_path`)
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
  const parentId = (data as unknown as Record<string, unknown>)[foreignKey];
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
  const deleted = await authorization.supabase
    .from(table)
    .delete()
    .eq("id", id);
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
    const cleanup = await removeObject(data.file_path, bucket);
    if (cleanup)
      logServerFailure(request, "resource-attachment.cleanup", cleanup);
  }
  return NextResponse.json({ deleted: true });
}
