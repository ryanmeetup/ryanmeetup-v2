import { getAdminClient } from "@/lib/server/admin-client";

export function attachmentObjectPath(resourceId: string, id: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${resourceId}/${id}-${safeName}`;
}

export async function uploadAttachmentObject(
  bucket: string,
  path: string,
  bytes: Uint8Array,
  mimeType: string,
) {
  const admin = getAdminClient();
  if (!admin) return { error: new Error("Attachment uploads are unavailable.") };
  return admin.storage.from(bucket).upload(path, bytes, {
    contentType: mimeType,
    upsert: false,
  });
}

export async function removeAttachmentObject(path: string, bucket: string) {
  const admin = getAdminClient();
  if (!admin) return new Error("Attachment storage cleanup is unavailable.");
  const { error } = await admin.storage.from(bucket).remove([path]);
  return error;
}

export async function signAttachmentObject(path: string, bucket: string) {
  const admin = getAdminClient();
  if (!admin) return { data: null, error: new Error("Attachment storage is unavailable.") };
  return admin.storage.from(bucket).createSignedUrl(path, 3600);
}

export async function signAttachmentObjects(paths: string[], bucket: string) {
  if (!paths.length) return { data: [] as { path: string; signedUrl?: string }[] };
  const admin = getAdminClient();
  if (!admin) return { data: [] as { path: string; signedUrl?: string }[] };
  return admin.storage.from(bucket).createSignedUrls(paths, 3600);
}
