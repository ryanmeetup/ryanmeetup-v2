import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACCESS_PREVIEW_PARAM,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access/access-preview";
import { resolveAccessPreview } from "@/lib/server/access-preview";
import { apiError } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import {
  canViewWorkspaceGoogleCalendar,
  googleCalendarMonthRange,
  loadGoogleCalendarIntegration,
  listGoogleCalendarEvents,
} from "@/lib/server/google-calendar";

// Owner access previews answer for the previewed subject, not the owner.
async function previewCalendarAccess(
  supabase: SupabaseClient,
  groupId?: string,
  userName?: string,
) {
  if (!groupId && !userName) return null;
  const { data: isOwner } = await supabase.rpc("is_app_owner");
  if (!isOwner) return null;
  const resolved = await resolveAccessPreview(supabase, {
    groupId,
    userName,
    allProjectIds: [],
  });
  return resolved ? resolved.preview.calendarAccess === true : null;
}

export async function GET(request: Request) {
  const authorization = await authorize({ onboarded: true, area: "calendar" });
  if ("response" in authorization) return authorization.response;
  const params = new URL(request.url).searchParams;
  const requestedGroupPreview = params.get(ACCESS_PREVIEW_PARAM) ?? undefined;
  const requestedUserPreview =
    params.get(USER_ACCESS_PREVIEW_PARAM) ?? undefined;
  try {
    const preview = await previewCalendarAccess(
      authorization.supabase,
      requestedGroupPreview,
      requestedUserPreview,
    );
    const allowed =
      preview === null
        ? await canViewWorkspaceGoogleCalendar(authorization.supabase)
        : preview;
    if (!allowed)
      return apiError(
        403,
        "FORBIDDEN",
        "You do not have access to the shared calendar.",
      );
  } catch (error) {
    console.error("Google Calendar permission could not be resolved", error);
    return apiError(
      503,
      "SERVICE_UNAVAILABLE",
      "Calendar access is unavailable.",
    );
  }
  const month = params.get("month") ?? "";
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
