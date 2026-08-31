import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server/admin-client";
import { authorize } from "@/lib/server/auth";
import { recordWorkspaceActivity } from "@/lib/server/privileged-api";
import {
  exchangeGoogleAuthorizationCode,
  googleAccountEmail,
  googleCalendarIntegrationValues,
  GOOGLE_OAUTH_COOKIE,
  parseGoogleOAuthCookie,
} from "@/lib/server/google-calendar";

function calendarRedirect(request: Request, status: string) {
  const response = NextResponse.redirect(
    new URL(`/calendar?google=${status}`, request.url),
  );
  response.cookies.set(GOOGLE_OAUTH_COOKIE, "", {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/api/integrations/google-calendar",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = parseGoogleOAuthCookie(
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${GOOGLE_OAUTH_COOKIE}=`))
      ?.slice(GOOGLE_OAUTH_COOKIE.length + 1),
  );
  if (!code || !state || !cookie || state !== cookie.state)
    return calendarRedirect(request, "invalid");

  const authorization = await authorize({ owner: true, onboarded: true });
  if ("response" in authorization) return calendarRedirect(request, "auth");
  const admin = getAdminClient();
  if (!admin) return calendarRedirect(request, "unavailable");

  let connectedEmail: string | null = null;
  try {
    const tokens = await exchangeGoogleAuthorizationCode(
      request,
      code,
      cookie.verifier,
    );
    if (!tokens.refresh_token)
      return calendarRedirect(request, "refresh-token");
    const email = await googleAccountEmail(tokens.access_token);
    const result = await admin
      .from("workspace_google_calendar_integrations")
      .upsert(
        googleCalendarIntegrationValues(
          tokens.refresh_token,
          email,
          authorization.user.id,
        ),
      );
    if (result.error) throw result.error;
    connectedEmail = email;
  } catch (error) {
    console.error("Google Calendar connection failed", error);
    return calendarRedirect(request, "failed");
  }
  // The workspace calendar changes shape for everyone when this connects, so
  // it is a workspace event and not just an owner's own setting. Recorded
  // after the try: the connection is already saved by this point.
  await recordWorkspaceActivity(admin, authorization.user, {
    action: "integration.google-calendar.connect",
    targetType: "workspace",
    metadata: {
      resource_name: "Google Calendar",
      resource_href: "/calendar",
      detail: connectedEmail ?? undefined,
    },
  });
  return calendarRedirect(request, "connected");
}
