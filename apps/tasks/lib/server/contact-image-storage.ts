import { getAdminClient } from "@/lib/server/admin-client";
import { detectAttachmentMimeType } from "@/lib/tasks/task-attachments";

export const CONTACT_IMAGE_BUCKET = "organization-images";
export const MAX_CONTACT_IMAGE_SIZE = 5 * 1024 * 1024;

const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type ContactImageMimeType = keyof typeof EXTENSIONS;

type ContactImageValidation =
  | { error: string; status: 400 | 413 | 415 }
  | { bytes: Uint8Array; mimeType: ContactImageMimeType };

export async function validateContactImage(
  file: FormDataEntryValue | null,
): Promise<ContactImageValidation> {
  if (!(file instanceof File))
    return { error: "A contact image is required.", status: 400 } as const;
  if (file.size === 0 || file.size > MAX_CONTACT_IMAGE_SIZE)
    return {
      error: "Choose a contact image that is 5 MB or smaller.",
      status: 413,
    } as const;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectAttachmentMimeType(bytes);
  if (!mimeType || !(mimeType in EXTENSIONS))
    return {
      error: "Contact images must be JPEG, PNG, or WebP files.",
      status: 415,
    } as const;
  return {
    bytes,
    mimeType: mimeType as ContactImageMimeType,
  } as const;
}

export function contactImageObjectPath(
  userId: string,
  contactId: string,
  imageId: string,
  mimeType: ContactImageMimeType,
) {
  return `${userId}/${contactId}/${imageId}.${EXTENSIONS[mimeType]}`;
}

export function isContactImagePathForContact(path: string, contactId: string) {
  const uuid =
    "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
  const currentPath = new RegExp(
    `^${uuid}/${contactId}/${uuid}\\.(?:jpg|png|webp)$`,
    "i",
  );
  const legacyPath = new RegExp(
    `^${uuid}/${uuid}\\.(?:jpg|jpeg|png|webp)$`,
    "i",
  );
  return currentPath.test(path) || legacyPath.test(path);
}

export async function uploadContactImage(
  path: string,
  bytes: Uint8Array,
  mimeType: ContactImageMimeType,
) {
  const admin = getAdminClient();
  if (!admin)
    return { error: new Error("Contact image uploads are unavailable.") };
  return admin.storage.from(CONTACT_IMAGE_BUCKET).upload(path, bytes, {
    contentType: mimeType,
    cacheControl: "31536000",
    upsert: false,
  });
}

export async function removeContactImage(path: string) {
  const admin = getAdminClient();
  if (!admin) return new Error("Contact image cleanup is unavailable.");
  const { error } = await admin.storage
    .from(CONTACT_IMAGE_BUCKET)
    .remove([path]);
  return error;
}
