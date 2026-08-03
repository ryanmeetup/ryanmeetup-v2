import { NextResponse } from "next/server";
import { tasksAppUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const destination = next?.startsWith("/") && !next.startsWith("//")
    ? next
    : "/profile";
  if (code) {
    const { error } = await (await createClient()).auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(tasksAppUrl("/login?recovery=invalid"));
  }
  return NextResponse.redirect(tasksAppUrl(destination));
}
