import { apiError } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import { getAdminClient } from "@/lib/server/admin-client";
import {
  GOOGLE_CALENDAR_INTEGRATION_ID,
  loadGoogleCalendarIntegration,
  revokeGoogleCalendar,
} from "@/lib/server/google-calendar";
import { readJson } from "@/lib/server/request";

const emptyObject = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).length === 0 ? {} : null;

export async function POST(request: Request) {
  const authorization = await authorize({ owner: true, onboarded: true });
  if ("response" in authorization) return authorization.response;
  const parsed = await readJson(request, emptyObject);
  if ("response" in parsed) return parsed.response;
  const admin = getAdminClient();
  if (!admin)
    return apiError(503, "SERVICE_UNAVAILABLE", "Google Calendar is unavailable.");

  try {
    const connection = await loadGoogleCalendarIntegration();
    if (connection) await revokeGoogleCalendar(connection);
    const result = await admin
      .from("workspace_google_calendar_integrations")
      .delete()
      .eq("id", GOOGLE_CALENDAR_INTEGRATION_ID);
    if (result.error) throw result.error;
  } catch (error) {
    console.error("Google Calendar connection could not be removed", error);
    return apiError(500, "OPERATION_FAILED", "Google Calendar could not be disconnected.");
  }
  return Response.json({ disconnected: true });
}
