import { apiError } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import {
  googleCalendarMonthRange,
  listGoogleCalendarEvents,
} from "@/lib/server/google-calendar";

export async function GET(request: Request) {
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!googleCalendarMonthRange(month))
    return apiError(400, "INVALID_REQUEST", "Choose a valid calendar month.");
  try {
    return Response.json({ events: await listGoogleCalendarEvents(authorization.user, month) });
  } catch (error) {
    console.error("Google Calendar events could not be loaded", error);
    return apiError(
      502,
      "OPERATION_FAILED",
      "Google Calendar could not be loaded. Reconnect it and try again.",
    );
  }
}
