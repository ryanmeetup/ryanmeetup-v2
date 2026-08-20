import { apiError } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import { getAdminClient } from "@/lib/server/admin-client";
import {
  revokeGoogleCalendar,
  withoutGoogleCalendarAppMetadata,
} from "@/lib/server/google-calendar";
import { readJson } from "@/lib/server/request";

const emptyObject = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).length === 0 ? {} : null;

export async function POST(request: Request) {
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const parsed = await readJson(request, emptyObject);
  if ("response" in parsed) return parsed.response;
  const admin = getAdminClient();
  if (!admin)
    return apiError(503, "SERVICE_UNAVAILABLE", "Google Calendar is unavailable.");

  await revokeGoogleCalendar(authorization.user);
  const result = await admin.auth.admin.updateUserById(authorization.user.id, {
    app_metadata: withoutGoogleCalendarAppMetadata(authorization.user),
  });
  if (result.error) {
    console.error("Google Calendar connection could not be removed", result.error);
    return apiError(500, "OPERATION_FAILED", "Google Calendar could not be disconnected.");
  }
  return Response.json({ disconnected: true });
}
