import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function authorizedUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, onboarding_completed")
    .eq("id", data.user.id)
    .single();
  return profile?.onboarding_completed ? data.user : null;
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key
    ? createAdminClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;
}

function normalizeOwnerIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (profileId): profileId is string =>
          typeof profileId === "string" && profileId.length > 0,
      ),
    ),
  ];
}

export async function POST(request: Request) {
  const user = await authorizedUser();
  if (!user)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const client = serviceClient();
  if (!client)
    return NextResponse.json(
      { error: "SUPABASE_SECRET_KEY is not configured" },
      { status: 503 },
    );
  const { name, ownerIds: requestedOwnerIds = [] } = (await request.json()) as {
    name?: string;
    ownerIds?: unknown;
  };
  const ownerIds = normalizeOwnerIds(requestedOwnerIds);
  if (!name?.trim())
    return NextResponse.json(
      { error: "A project name is required" },
      { status: 400 },
    );
  const { data, error } = await client
    .from("projects")
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  if (ownerIds.length > 0) {
    const { error: ownersError } = await client.from("project_owners").upsert(
      ownerIds.map((profile_id) => ({
        project_id: data.id,
        profile_id,
      })),
      { onConflict: "project_id,profile_id" },
    );
    if (ownersError)
      return NextResponse.json({ error: ownersError.message }, { status: 400 });
  }
  return NextResponse.json({ project: data });
}

export async function PATCH(request: Request) {
  if (!(await authorizedUser()))
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const client = serviceClient();
  if (!client)
    return NextResponse.json(
      { error: "SUPABASE_SECRET_KEY is not configured" },
      { status: 503 },
    );
  const {
    id,
    name,
    archived,
    ownerIds: requestedOwnerIds,
  } = (await request.json()) as {
    id?: string;
    name?: string;
    archived?: boolean;
    ownerIds?: unknown;
  };
  if (!id || (name !== undefined && !name.trim()))
    return NextResponse.json(
      { error: "A project and valid update are required" },
      { status: 400 },
    );
  const updates: { name?: string; archived_at?: string | null } = {};
  if (name !== undefined) updates.name = name.trim();
  if (archived !== undefined)
    updates.archived_at = archived ? new Date().toISOString() : null;
  if (Object.keys(updates).length > 0) {
    const { error } = await client
      .from("projects")
      .update(updates)
      .eq("id", id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (requestedOwnerIds !== undefined) {
    const ownerIds = normalizeOwnerIds(requestedOwnerIds);
    const { error: deleteError } = await client
      .from("project_owners")
      .delete()
      .eq("project_id", id);
    if (deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    if (ownerIds.length > 0) {
      const { error: ownersError } = await client.from("project_owners").upsert(
        ownerIds.map((profile_id) => ({ project_id: id, profile_id })),
        { onConflict: "project_id,profile_id" },
      );
      if (ownersError)
        return NextResponse.json(
          { error: ownersError.message },
          { status: 400 },
        );
    }
  }
  return NextResponse.json({ ok: true });
}
