import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function authorizeTeamMember() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, onboarding_completed")
    .eq("id", auth.user.id)
    .single();
  if (!profile?.onboarding_completed) return false;
  const { data: isOwner } = await supabase.rpc("is_app_owner");
  return Boolean(isOwner);
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
  if (!(await authorizeTeamMember()))
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const client = serviceClient();
  if (!client)
    return NextResponse.json(
      { error: "Supabase server credentials are not configured" },
      { status: 503 },
    );
  const { name, color } = (await request.json()) as {
    name?: string;
    color?: string;
  };
  if (!name?.trim() || !validColor(color))
    return NextResponse.json(
      { error: "A name and valid color are required" },
      { status: 400 },
    );
  const { data: finalStatus } = await client
    .from("statuses")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await client
    .from("statuses")
    .insert({
      name: name.trim(),
      color,
      sort_order: (finalStatus?.sort_order ?? -1) + 1,
      is_default: false,
      is_completed: false,
    })
    .select("*")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: data });
}

export async function PATCH(request: Request) {
  if (!(await authorizeTeamMember()))
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const client = serviceClient();
  if (!client)
    return NextResponse.json(
      { error: "Supabase server credentials are not configured" },
      { status: 503 },
    );
  const body = (await request.json()) as {
    id?: string;
    name?: string;
    isCompleted?: boolean;
    orderedIds?: string[];
  };

  if (body.orderedIds) {
    const orderedIds = [...new Set(body.orderedIds)];
    const { data: statuses, error: readError } = await client
      .from("statuses")
      .select("*");
    if (readError)
      return NextResponse.json({ error: readError.message }, { status: 400 });
    if (
      statuses.length !== orderedIds.length ||
      statuses.some((status) => !orderedIds.includes(status.id))
    ) {
      return NextResponse.json(
        { error: "The status list changed. Refresh and try again." },
        { status: 409 },
      );
    }
    const order = new Map(orderedIds.map((id, index) => [id, index]));
    const { data, error } = await client
      .from("statuses")
      .upsert(
        statuses.map((status) => ({
          ...status,
          sort_order: order.get(status.id),
        })),
      )
      .select("*");
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ statuses: data });
  }

  if (!body.id)
    return NextResponse.json(
      { error: "A status is required" },
      { status: 400 },
    );
  const updates: { name?: string; is_completed?: boolean } = {};
  if (body.name !== undefined) {
    if (!body.name.trim())
      return NextResponse.json(
        { error: "A status name is required" },
        { status: 400 },
      );
    updates.name = body.name.trim();
  }
  if (body.isCompleted !== undefined) updates.is_completed = body.isCompleted;
  if (Object.keys(updates).length === 0)
    return NextResponse.json(
      { error: "No status changes were provided" },
      { status: 400 },
    );
  const { data, error } = await client
    .from("statuses")
    .update(updates)
    .eq("id", body.id)
    .select("*")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: data });
}

export async function DELETE(request: Request) {
  if (!(await authorizeTeamMember()))
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const client = serviceClient();
  if (!client)
    return NextResponse.json(
      { error: "Supabase server credentials are not configured" },
      { status: 503 },
    );
  const { id } = (await request.json()) as { id?: string };
  if (!id)
    return NextResponse.json(
      { error: "A status is required" },
      { status: 400 },
    );
  const { data, error } = await client
    .from("statuses")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
