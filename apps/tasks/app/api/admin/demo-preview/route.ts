import { NextResponse } from "next/server";
import { demoPreviewSchema } from "@/lib/api-schema";
import { authorize } from "@/lib/server/auth";
import { readJson } from "@/lib/server/request";
import {
  DEMO_PREVIEW_COOKIE,
  DEMO_PREVIEW_MAX_AGE_SECONDS,
  DEMO_PREVIEW_VALUE,
} from "@/lib/demo-preview";

/**
 * Turn demo preview on or off for the caller's own browser.
 *
 * Nothing is persisted: the whole effect is one cookie on this response, so
 * the preview belongs to one owner's session and never changes what anyone
 * else sees. The cookie is `httpOnly` because no client code needs to read it
 * — `isDemoBuild` already tells the browser whether a visible demo is a
 * preview or a real demo build — and the server re-checks ownership on every
 * request anyway.
 */
export async function POST(request: Request) {
  const parsed = await readJson(request, demoPreviewSchema);
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ owner: true });
  if ("response" in authorization) return authorization.response;

  const { enabled } = parsed.data;
  const response = NextResponse.json({ enabled });
  if (enabled) {
    response.cookies.set({
      name: DEMO_PREVIEW_COOKIE,
      value: DEMO_PREVIEW_VALUE,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DEMO_PREVIEW_MAX_AGE_SECONDS,
    });
  } else {
    response.cookies.set({
      name: DEMO_PREVIEW_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
