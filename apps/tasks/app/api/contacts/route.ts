import { NextResponse } from "next/server";
import {
  contactDeleteSchema,
  contactSaveSchema,
} from "@/lib/contacts/contact-schema";
import { isAllowedTasksRequestOrigin } from "@/lib/app-url";
import {
  apiError,
  databaseFailure,
  logServerFailure,
} from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import {
  contactImageObjectPath,
  isContactImagePathForContact,
  MAX_CONTACT_IMAGE_SIZE,
  removeContactImage,
  uploadContactImage,
  validateContactImage,
} from "@/lib/server/contact-image-storage";
import { readJson } from "@/lib/server/request";

async function readContactSaveRequest(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0];
  if (contentType === "application/json") {
    const parsed = await readJson(request, contactSaveSchema);
    return "response" in parsed
      ? parsed
      : ({ data: parsed.data, file: null } as const);
  }
  if (contentType !== "multipart/form-data")
    return {
      response: apiError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Send contact details as JSON or multipart form data.",
      ),
    } as const;

  let originAllowed = false;
  try {
    originAllowed = isAllowedTasksRequestOrigin(request.headers.get("origin"));
  } catch {
    // Invalid application URL configuration is handled as a rejected origin.
  }
  if (!originAllowed)
    return {
      response: apiError(
        403,
        "ORIGIN_REJECTED",
        "This request did not come from the Tasks app.",
      ),
    } as const;
  const declaredSize = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredSize) &&
    declaredSize > MAX_CONTACT_IMAGE_SIZE + 64 * 1024
  )
    return {
      response: apiError(
        413,
        "REQUEST_TOO_LARGE",
        "The contact image is too large.",
      ),
    } as const;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return {
      response: apiError(
        400,
        "INVALID_REQUEST",
        "The contact image request is not valid.",
      ),
    } as const;
  }
  if (
    [...formData.keys()].some((key) => key !== "contact" && key !== "file") ||
    formData.getAll("contact").length !== 1 ||
    formData.getAll("file").length !== 1
  )
    return {
      response: apiError(
        400,
        "INVALID_REQUEST",
        "The contact image request is not valid.",
      ),
    } as const;
  const contact = formData.get("contact");
  if (typeof contact !== "string")
    return {
      response: apiError(
        400,
        "INVALID_REQUEST",
        "Contact details are required.",
      ),
    } as const;
  let value: unknown;
  try {
    value = JSON.parse(contact);
  } catch {
    return {
      response: apiError(
        400,
        "INVALID_REQUEST",
        "The contact details are not valid.",
      ),
    } as const;
  }
  const data = contactSaveSchema(value);
  return data
    ? ({ data, file: formData.get("file") } as const)
    : ({
        response: apiError(
          400,
          "INVALID_REQUEST",
          "The contact fields are not valid.",
        ),
      } as const);
}

async function save(request: Request) {
  const parsed = await readContactSaveRequest(request);
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const contactId = parsed.data.id ?? crypto.randomUUID();
  const existing = parsed.data.id
    ? await authorization.supabase
        .from("contacts")
        .select("image_path")
        .eq("id", parsed.data.id)
        .maybeSingle()
    : { data: null, error: null };
  if (existing.error)
    return databaseFailure(request, "contact.image-lookup", existing.error, {
      error: "The contact image could not be checked. Try again.",
    });

  const validatedImage = parsed.file
    ? await validateContactImage(parsed.file)
    : null;
  if (validatedImage && "error" in validatedImage)
    return apiError(
      validatedImage.status,
      validatedImage.status === 413
        ? "REQUEST_TOO_LARGE"
        : validatedImage.status === 415
          ? "UNSUPPORTED_MEDIA_TYPE"
          : "INVALID_REQUEST",
      validatedImage.error,
    );
  let uploadedPath: string | null = null;
  if (validatedImage && !("error" in validatedImage)) {
    uploadedPath = contactImageObjectPath(
      authorization.user.id,
      contactId,
      crypto.randomUUID(),
      validatedImage.mimeType,
    );
    const uploaded = await uploadContactImage(
      uploadedPath,
      validatedImage.bytes,
      validatedImage.mimeType,
    );
    if (uploaded.error)
      return databaseFailure(request, "contact.image-upload", uploaded.error, {
        error: "The contact image could not be uploaded. Try again.",
      });
  }

  const { data: contact, error } = await authorization.supabase.rpc(
    "save_contact_with_activity",
    {
      contact_id: contactId,
      contact_is_new: !parsed.data.id,
      contact_name: parsed.data.displayName,
      contact_notes: parsed.data.notes,
      contact_image_url: uploadedPath ? null : parsed.data.imageUrl,
      contact_image_path: uploadedPath,
      retain_contact_image: parsed.data.retainImage,
      contact_group_name: parsed.data.contactGroup,
      category_ids: parsed.data.categoryIds,
      new_category_names: parsed.data.newCategoryNames,
      people: parsed.data.people,
    },
  );
  if (error) {
    const cleanup = uploadedPath
      ? await removeContactImage(uploadedPath)
      : null;
    return databaseFailure(request, "contact.save", error, {
      error: "The contact could not be saved. Try again.",
      conflictError: "A contact or category with that name already exists.",
      relatedFailures: { storageCleanup: cleanup },
    });
  }
  const previousPath = existing.data?.image_path;
  if (
    previousPath &&
    previousPath !== uploadedPath &&
    (Boolean(uploadedPath) || !parsed.data.retainImage) &&
    isContactImagePathForContact(previousPath, contactId)
  ) {
    const cleanup = await removeContactImage(previousPath);
    if (cleanup) logServerFailure(request, "contact.image-cleanup", cleanup);
  }
  if (!contact)
    return apiError(
      500,
      "OPERATION_FAILED",
      "The contact could not be saved. Try again.",
    );
  return NextResponse.json({ contact });
}

export const POST = save;
export const PATCH = save;

export async function DELETE(request: Request) {
  const parsed = await readJson(request, contactDeleteSchema);
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const result = await authorization.supabase
    .from("contacts")
    .delete()
    .eq("id", parsed.data.id)
    .select("id,display_name,image_path")
    .single();
  if (result.error)
    return databaseFailure(request, "contact.delete", result.error, {
      error: "The contact could not be deleted. Try again.",
    });
  if (
    result.data.image_path &&
    isContactImagePathForContact(result.data.image_path, result.data.id)
  ) {
    const cleanup = await removeContactImage(result.data.image_path);
    if (cleanup) logServerFailure(request, "contact.image-cleanup", cleanup);
  }
  return NextResponse.json({ ok: true });
}
