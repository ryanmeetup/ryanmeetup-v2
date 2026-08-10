import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server/admin-client";
import { databaseFailure, logServerFailure } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import {
  detectAttachmentMimeType,
  MAX_ATTACHMENT_SIZE,
} from "@/lib/task-attachments";
import type { ProjectAttachment } from "@/lib/types";

export const runtime = "nodejs";

const columns =
  "id,project_id,kind,name,body,url,file_path,mime_type,size_bytes,created_by,created_at";

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

async function removeObject(path: string) {
  const admin = getAdminClient();
  if (!admin) return new Error("Attachment storage cleanup is unavailable.");
  const { error } = await admin.storage
    .from("project-attachments")
    .remove([path]);
  return error;
}

export async function GET(request: Request) {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId)
    return NextResponse.json({ error: "A project is required." }, { status: 400 });

  const { data, error } = await authorization.supabase
    .from("project_attachments")
    .select(columns)
    .eq("project_id", projectId)
    .order("created_at");
  if (error)
    return databaseFailure(request, "project-attachment.list", error, {
      error: "Project attachments could not be loaded.",
    });

  const paths = (data ?? []).flatMap((item) =>
    item.file_path ? [item.file_path] : [],
  );
  const signed = paths.length
    ? await authorization.supabase.storage
        .from("project-attachments")
        .createSignedUrls(paths, 3600)
    : { data: [] };
  const urls = new Map(
    (signed.data ?? []).flatMap((item) =>
      item.signedUrl ? [[item.path, item.signedUrl] as const] : [],
    ),
  );
  return NextResponse.json({
    attachments: (data ?? []).map((item) => ({
      ...item,
      url: item.file_path ? urls.get(item.file_path) ?? "" : "",
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
      name?: string;
      body?: string;
    };
    const projectId = body.projectId;
    const name = body.name?.trim();
    const note = body.body?.trim();
    if (!projectId || !name || name.length > 200 || !note || note.length > 10000)
      return NextResponse.json({ error: "Add a title and note." }, { status: 400 });
    if (!(await canEditProject(supabase, projectId)))
      return NextResponse.json({ error: "You cannot edit this project." }, { status: 403 });
    const { data, error } = await supabase
      .from("project_attachments")
      .insert({
        project_id: projectId,
        kind: "note",
        name,
        body: note,
        created_by: user.id,
      })
      .select(columns)
      .single();
    if (error)
      return databaseFailure(request, "project-attachment.note", error, {
        error: "The note could not be attached.",
      });
    return NextResponse.json({ attachment: data });
  }

  const formData = await request.formData();
  const projectId = formData.get("projectId");
  const file = formData.get("file");
  if (typeof projectId !== "string" || !(file instanceof File))
    return NextResponse.json({ error: "A project and file are required." }, { status: 400 });
  if (file.size === 0 || file.size > MAX_ATTACHMENT_SIZE)
    return NextResponse.json({ error: "Files must be between 1 byte and 10 MB." }, { status: 413 });
  if (!(await canEditProject(supabase, projectId)))
    return NextResponse.json({ error: "You cannot edit this project." }, { status: 403 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectAttachmentMimeType(bytes);
  if (!mimeType)
    return NextResponse.json(
      { error: "Only PDF, JPEG, PNG, WebP, and plain-text files are allowed." },
      { status: 415 },
    );
  const admin = getAdminClient();
  if (!admin)
    return NextResponse.json({ error: "Attachment uploads are unavailable." }, { status: 503 });

  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${projectId}/${id}-${safeName}`;
  const uploaded = await admin.storage
    .from("project-attachments")
    .upload(path, bytes, { contentType: mimeType, upsert: false });
  if (uploaded.error)
    return databaseFailure(request, "project-attachment.upload", uploaded.error, {
      error: "The file could not be uploaded.",
    });

  const attachment = {
    id,
    project_id: projectId,
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
  const { error } = await supabase.from("project_attachments").insert(attachment);
  if (error) {
    const cleanup = await removeObject(path);
    return databaseFailure(request, "project-attachment.record", error, {
      error: "The file could not be attached.",
      relatedFailures: { storageCleanup: cleanup },
    });
  }
  const signed = await admin.storage
    .from("project-attachments")
    .createSignedUrl(path, 3600);
  if (signed.error) {
    await supabase.from("project_attachments").delete().eq("id", id);
    await removeObject(path);
    return databaseFailure(request, "project-attachment.sign", signed.error, {
      error: "The file was uploaded but could not be opened.",
    });
  }
  return NextResponse.json({
    attachment: { ...attachment, url: signed.data.signedUrl } satisfies ProjectAttachment,
  });
}

export async function DELETE(request: Request) {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "An attachment is required." }, { status: 400 });
  const { data, error } = await authorization.supabase
    .from("project_attachments")
    .select("id,project_id,file_path")
    .eq("id", id)
    .maybeSingle();
  if (error)
    return databaseFailure(request, "project-attachment.lookup", error, {
      error: "The attachment could not be found.",
    });
  if (!data) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  if (!(await canEditProject(authorization.supabase, data.project_id)))
    return NextResponse.json({ error: "You cannot edit this project." }, { status: 403 });
  const deleted = await authorization.supabase
    .from("project_attachments")
    .delete()
    .eq("id", id);
  if (deleted.error)
    return databaseFailure(request, "project-attachment.delete", deleted.error, {
      error: "The attachment could not be removed.",
    });
  if (data.file_path) {
    const cleanup = await removeObject(data.file_path);
    if (cleanup) logServerFailure(request, "project-attachment.cleanup", cleanup);
  }
  return NextResponse.json({ deleted: true });
}
