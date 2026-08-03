import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function authorizeTeamMember() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return {
      user: null,
      error: "Supabase public credentials are not configured",
    };
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { user: null, error: "Not authorized" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, onboarding_completed")
    .eq("id", auth.user.id)
    .single();
  return profile?.onboarding_completed
    ? { user: auth.user, error: null }
    : { user: null, error: "Not authorized" };
}

function authorizationResponse(error: string) {
  return NextResponse.json(
    { error },
    { status: error.includes("not configured") ? 503 : 403 },
  );
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const validColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

export async function POST(request: Request) {
  const authorization = await authorizeTeamMember();
  if (!authorization.user) return authorizationResponse(authorization.error);
  const user = authorization.user;
  const client = serviceClient();
  if (!client)
    return NextResponse.json(
      { error: "SUPABASE_SECRET_KEY is not configured" },
      { status: 503 },
    );
  const { name, description, color } = (await request.json()) as {
    name?: string;
    description?: string;
    color?: string;
  };
  if (!name?.trim() || !validColor(color))
    return NextResponse.json(
      { error: "A name and valid color are required" },
      { status: 400 },
    );
  const { data, error } = await client
    .from("work_groups")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      color,
      created_by: user.id,
    })
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ workGroup: data });
}

export async function PATCH(request: Request) {
  const authorization = await authorizeTeamMember();
  if (!authorization.user) return authorizationResponse(authorization.error);
  const client = serviceClient();
  if (!client)
    return NextResponse.json(
      { error: "SUPABASE_SECRET_KEY is not configured" },
      { status: 503 },
    );
  const { id, name, description, color } = (await request.json()) as {
    id?: string;
    name?: string;
    description?: string;
    color?: string;
  };
  if (!id || !name?.trim() || !validColor(color))
    return NextResponse.json(
      { error: "A category, name, and valid color are required" },
      { status: 400 },
    );
  const { error } = await client
    .from("work_groups")
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      color,
    })
    .eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const authorization = await authorizeTeamMember();
  if (!authorization.user) return authorizationResponse(authorization.error);
  const client = serviceClient();
  if (!client)
    return NextResponse.json(
      { error: "SUPABASE_SECRET_KEY is not configured" },
      { status: 503 },
    );
  const { id } = (await request.json()) as { id?: string };
  if (!id)
    return NextResponse.json(
      { error: "A category is required" },
      { status: 400 },
    );
  const { error } = await client.from("work_groups").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
