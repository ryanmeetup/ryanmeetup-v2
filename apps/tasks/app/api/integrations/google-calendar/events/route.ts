import { apiError } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import {
  canViewWorkspaceGoogleCalendar,
  googleCalendarMonthRange,
  loadGoogleCalendarIntegration,
  listGoogleCalendarEvents,
} from "@/lib/server/google-calendar";

export async function GET(request: Request) {
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  try {
    if (!(await canViewWorkspaceGoogleCalendar(authorization.supabase)))
      return apiError(403, "FORBIDDEN", "You do not have access to the shared calendar.");
  } catch (error) {
    console.error("Google Calendar permission could not be resolved", error);
    return apiError(503, "SERVICE_UNAVAILABLE", "Calendar access is unavailable.");
  }
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!googleCalendarMonthRange(month))
    return apiError(400, "INVALID_REQUEST", "Choose a valid calendar month.");
  try {
    const connection = await loadGoogleCalendarIntegration();
    return Response.json({
      events: connection
        ? await listGoogleCalendarEvents(connection, month)
        : [],
    });
  } catch (error) {
    console.error("Google Calendar events could not be loaded", error);
    return apiError(
      502,
      "OPERATION_FAILED",
      "Google Calendar could not be loaded. Reconnect it and try again.",
    );
  }
}
