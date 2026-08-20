import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/server/admin-client";
import {
  exchangeGoogleAuthorizationCode,
  googleAccountEmail,
  googleCalendarAppMetadata,
  GOOGLE_OAUTH_COOKIE,
  parseGoogleOAuthCookie,
} from "@/lib/server/google-calendar";

function calendarRedirect(request: Request, status: string) {
  const response = NextResponse.redirect(new URL(`/calendar?google=${status}`, request.url));
  response.cookies.set(GOOGLE_OAUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/google-calendar/callback",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = parseGoogleOAuthCookie(
    request.headers.get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${GOOGLE_OAUTH_COOKIE}=`))
      ?.slice(GOOGLE_OAUTH_COOKIE.length + 1),
  );
  if (!code || !state || !cookie || state !== cookie.state)
    return calendarRedirect(request, "invalid");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return calendarRedirect(request, "auth");
  const admin = getAdminClient();
  if (!admin) return calendarRedirect(request, "unavailable");

  try {
    const tokens = await exchangeGoogleAuthorizationCode(request, code, cookie.verifier);
    if (!tokens.refresh_token) return calendarRedirect(request, "refresh-token");
    const email = await googleAccountEmail(tokens.access_token);
    const result = await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: googleCalendarAppMetadata(data.user, tokens.refresh_token, email),
    });
    if (result.error) throw result.error;
  } catch (error) {
    console.error("Google Calendar connection failed", error);
    return calendarRedirect(request, "failed");
  }
  return calendarRedirect(request, "connected");
}
