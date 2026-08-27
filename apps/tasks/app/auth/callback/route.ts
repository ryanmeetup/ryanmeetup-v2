import { NextResponse } from "next/server";
import { tasksAppUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";
import { authCallbackDestination } from "@/lib/workspace/entry-route";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const destination = authCallbackDestination(next);
  if (code) {
    const { error } = await (
      await createClient()
    ).auth.exchangeCodeForSession(code);
    if (error)
      return NextResponse.redirect(
        tasksAppUrl("/login?recovery=invalid", request),
      );
  }
  return NextResponse.redirect(tasksAppUrl(destination, request));
}
