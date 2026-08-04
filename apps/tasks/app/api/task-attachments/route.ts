import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  detectAttachmentMimeType,
  MAX_ATTACHMENT_SIZE,
} from "@/lib/task-attachments";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function createStorageAdmin() {
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) return null;

  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function removeObject(path: string) {
  const admin = createStorageAdmin();
  if (!admin) return new Error("Attachment Storage cleanup is unavailable.");

  const { error } = await admin.storage.from("task-attachments").remove([path]);
  return error;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );

  const formData = await request.formData();
  const taskId = formData.get("taskId");
  const file = formData.get("file");
  if (typeof taskId !== "string" || !(file instanceof File))
    return NextResponse.json(
      { error: "A task and file are required." },
      { status: 400 },
    );
  if (file.size === 0 || file.size > MAX_ATTACHMENT_SIZE)
    return NextResponse.json(
      { error: "Files must be between 1 byte and 10 MB." },
      { status: 413 },
    );

  const { data: canEdit, error: permissionError } = await supabase.rpc(
    "can_edit_task",
    { requested_task_id: taskId },
  );
  if (permissionError || !canEdit)
    return NextResponse.json(
      { error: "You cannot attach files to this task." },
      { status: 403 },
    );

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectAttachmentMimeType(bytes);
  if (!mimeType)
    return NextResponse.json(
      { error: "Only PDF, JPEG, PNG, WebP, and plain-text files are allowed." },
      { status: 415 },
    );

  const admin = createStorageAdmin();
  if (!admin)
    return NextResponse.json(
      { error: "Attachment uploads are unavailable." },
      { status: 503 },
    );

  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${taskId}/${id}-${safeName}`;
  const uploaded = await admin.storage
    .from("task-attachments")
    .upload(path, bytes, { contentType: mimeType, upsert: false });
  if (uploaded.error)
    return NextResponse.json(
      { error: uploaded.error.message },
      { status: 400 },
    );

  const attachment = {
    id,
    task_id: taskId,
    name: file.name,
    url: "",
    file_path: path,
    mime_type: mimeType,
    size_bytes: file.size,
    created_by: authData.user.id,
    created_at: new Date().toISOString(),
  };
  const { error: rowError } = await supabase
    .from("task_attachments")
    .insert(attachment);
  if (rowError) {
    const cleanupError = await removeObject(path);
    return NextResponse.json(
      {
        error: cleanupError
          ? `${rowError.message} Storage cleanup was deferred.`
          : rowError.message,
      },
      { status: 400 },
    );
  }

  const signed = await admin.storage
    .from("task-attachments")
    .createSignedUrl(path, 60 * 60);
  if (signed.error) {
    const { error: rowCleanupError } = await supabase
      .from("task_attachments")
      .delete()
      .eq("id", id);
    const objectCleanupError = await removeObject(path);
    const cleanupDeferred = Boolean(rowCleanupError || objectCleanupError);
    return NextResponse.json(
      {
        error: cleanupDeferred
          ? `${signed.error.message} Cleanup was deferred.`
          : signed.error.message,
      },
      { status: 500 },
    );
  }
  return NextResponse.json({
    attachment: { ...attachment, url: signed.data.signedUrl },
  });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );

  const id = new URL(request.url).searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { error: "An attachment is required." },
      { status: 400 },
    );

  const { data: attachment, error: lookupError } = await supabase
    .from("task_attachments")
    .select("id, task_id, file_path")
    .eq("id", id)
    .maybeSingle();
  if (lookupError)
    return NextResponse.json({ error: lookupError.message }, { status: 400 });
  if (!attachment)
    return NextResponse.json(
      { error: "Attachment not found." },
      { status: 404 },
    );

  const { data: canEdit, error: permissionError } = await supabase.rpc(
    "can_edit_task",
    { requested_task_id: attachment.task_id },
  );
  if (permissionError || !canEdit)
    return NextResponse.json(
      { error: "You cannot remove files from this task." },
      { status: 403 },
    );

  const { error: rowError } = await supabase
    .from("task_attachments")
    .delete()
    .eq("id", id);
  if (rowError)
    return NextResponse.json({ error: rowError.message }, { status: 403 });

  if (!attachment.file_path) return NextResponse.json({ deleted: true });

  const cleanupError = await removeObject(attachment.file_path);
  if (cleanupError) {
    console.error("Task attachment Storage cleanup deferred", {
      attachmentId: id,
      path: attachment.file_path,
      error: cleanupError.message,
    });
  }

  return NextResponse.json({
    deleted: true,
    cleanupDeferred: Boolean(cleanupError),
  });
}
