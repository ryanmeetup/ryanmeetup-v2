import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import {
  createGoogleOAuthRequest,
  GOOGLE_OAUTH_COOKIE,
  isGoogleCalendarConfigured,
} from "@/lib/server/google-calendar";

export async function GET(request: Request) {
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  if (!isGoogleCalendarConfigured())
    return NextResponse.redirect(new URL("/calendar?google=unavailable", request.url));

  const oauth = createGoogleOAuthRequest(request);
  const response = NextResponse.redirect(oauth.url);
  response.cookies.set(GOOGLE_OAUTH_COOKIE, oauth.cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/google-calendar/callback",
    maxAge: 10 * 60,
  });
  return response;
}
