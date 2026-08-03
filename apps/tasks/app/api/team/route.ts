import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function authorizeTeamMember() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, onboarding_completed")
    .eq("id", auth.user.id)
    .single();
  return profile?.onboarding_completed ? auth.user : null;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function appOrigin(request: Request) {
  const configuredOrigin = process.env.TASKS_APP_URL?.trim();
  if (configuredOrigin) return configuredOrigin.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production")
    return "https://tasks.ryanmeetup.com";
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!(await authorizeTeamMember()))
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const admin = adminClient();
  if (!admin)
    return NextResponse.json(
      { error: "SUPABASE_SECRET_KEY is not configured" },
      { status: 503 },
    );
  const { email, fullName } = (await request.json()) as {
    email?: string;
    fullName?: string;
  };
  if (!email?.trim())
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    email.trim(),
    {
      data: {
        full_name: fullName?.trim() || email.split("@")[0],
      },
      redirectTo: new URL("/auth/callback", appOrigin(request)).toString(),
    },
  );
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: data.user });
}

export async function DELETE(request: Request) {
  const requester = await authorizeTeamMember();
  if (!requester)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const admin = adminClient();
  if (!admin)
    return NextResponse.json(
      { error: "SUPABASE_SECRET_KEY is not configured" },
      { status: 503 },
    );
  const { userId } = (await request.json()) as { userId?: string };
  if (!userId || userId === requester.id)
    return NextResponse.json(
      { error: "You cannot remove your own account" },
      { status: 400 },
    );
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
