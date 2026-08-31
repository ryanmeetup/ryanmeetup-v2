import { NextResponse } from "next/server";
import { databaseFailure } from "@/lib/server/api-response";
import {
  apiError,
  auditPrivilegedAction,
  privilegedContext,
  recordWorkspaceActivity,
} from "@/lib/server/privileged-api";
import { isAllowedTasksRequestOrigin } from "@/lib/app-url";

const BUCKET = "instance-assets";
const MAX_BYTES = 2 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

/**
 * Upload the instance wordmark. Multipart, so it cannot go through `readJson`;
 * the origin check that `readJson` normally performs is done explicitly here.
 */
export async function POST(request: Request) {
  if (!isAllowedTasksRequestOrigin(request.headers.get("origin")))
    return apiError(
      403,
      "ORIGIN_REJECTED",
      "This request origin is not allowed.",
    );

  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(400, "INVALID_REQUEST", "A logo file is required.");
  }
  const file = form.get("file");
  if (!(file instanceof File))
    return apiError(400, "INVALID_REQUEST", "A logo file is required.");
  if (file.size === 0 || file.size > MAX_BYTES)
    return apiError(413, "REQUEST_TOO_LARGE", "Logos must be 2 MB or smaller.");
  const extension = EXTENSIONS[file.type];
  if (!extension)
    return apiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Logos must be PNG, JPEG, SVG, or WebP.",
    );

  // A fresh name per upload so a replaced logo is never served from cache.
  const path = `logo-${crypto.randomUUID()}.${extension}`;
  const { error } = await context.admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error)
    return databaseFailure(request, "instance-settings.logo", error, {
      error: "The logo could not be uploaded. Try again.",
    });

  const {
    data: { publicUrl },
  } = context.admin.storage.from(BUCKET).getPublicUrl(path);

  if (
    !(await auditPrivilegedAction(context.admin, context.user, {
      action: "instance-settings.logo",
      targetType: "instance_settings",
      metadata: { path },
    }))
  )
    return apiError(
      500,
      "AUDIT_FAILED",
      "The logo was uploaded, but the audit record could not be written.",
    );

  await recordWorkspaceActivity(context.admin, context.user, {
    action: "settings.logo.update",
    targetType: "workspace",
    metadata: { resource_name: "Workspace logo" },
  });

  return NextResponse.json({ logoPath: publicUrl });
}
