import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProjectLink } from "@/lib/types";

function validateLinks(value: unknown): ProjectLink[] | null {
  if (!Array.isArray(value) || value.length > 10) return null;
  const links: ProjectLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const { label, url } = item as { label?: unknown; url?: unknown };
    if (typeof label !== "string" || typeof url !== "string") return null;
    const trimmedLabel = label.trim();
    const trimmedUrl = url.trim();
    if (!trimmedLabel || trimmedLabel.length > 80 || trimmedUrl.length > 2048)
      return null;
    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
        return null;
    } catch {
      return null;
    }
    links.push({ label: trimmedLabel, url: trimmedUrl });
  }
  return links;
}

async function authorizedUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, onboarding_completed")
    .eq("id", data.user.id)
    .single();
  return profile?.onboarding_completed ? { user: data.user, supabase } : null;
}

export async function POST(request: Request) {
  const authorization = await authorizedUser();
  if (!authorization)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const { user, supabase } = authorization;
  const { data: isOwner } = await supabase.rpc("is_app_owner");
  if (!isOwner)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const {
    name,
    description,
    links: rawLinks = [],
    ownerIds = [],
  } = (await request.json()) as {
    name?: string;
    description?: string;
    links?: unknown;
    ownerIds?: string[];
  };
  const links = validateLinks(rawLinks);
  if (!name?.trim())
    return NextResponse.json(
      { error: "A project name is required" },
      { status: 400 },
    );
  if (!links)
    return NextResponse.json(
      { error: "Add valid HTTP or HTTPS project links" },
      { status: 400 },
    );
  if (!Array.isArray(ownerIds) || ownerIds.some((id) => typeof id !== "string"))
    return NextResponse.json(
      { error: "Select valid project owners" },
      { status: 400 },
    );
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      links,
      created_by: user.id,
    })
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  if (ownerIds.length > 0) {
    const { error: ownersError } = await supabase.from("project_owners").insert(
      [...new Set(ownerIds)].map((profile_id) => ({
        project_id: data.id,
        profile_id,
      })),
    );
    if (ownersError)
      return NextResponse.json({ error: ownersError.message }, { status: 400 });
  }
  return NextResponse.json({ project: data });
}

export async function PATCH(request: Request) {
  const authorization = await authorizedUser();
  if (!authorization)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const { supabase } = authorization;
  const {
    id,
    name,
    description,
    links: rawLinks,
    archived,
    ownerIds,
  } = (await request.json()) as {
    id?: string;
    name?: string;
    description?: string;
    links?: unknown;
    archived?: boolean;
    ownerIds?: string[];
  };
  const links = rawLinks === undefined ? undefined : validateLinks(rawLinks);
  if (!id || (name !== undefined && !name.trim()))
    return NextResponse.json(
      { error: "A project and valid update are required" },
      { status: 400 },
    );
  if (links === null)
    return NextResponse.json(
      { error: "Add valid HTTP or HTTPS project links" },
      { status: 400 },
    );
  if (
    ownerIds !== undefined &&
    (!Array.isArray(ownerIds) ||
      ownerIds.some((ownerId) => typeof ownerId !== "string"))
  )
    return NextResponse.json(
      { error: "Select valid project owners" },
      { status: 400 },
    );
  const { data: canManage } = await supabase.rpc("can_manage_project", {
    project_id: id,
  });
  if (!canManage)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updates: {
    name?: string;
    description?: string | null;
    archived_at?: string | null;
    links?: ProjectLink[];
  } = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined)
    updates.description = description.trim() || null;
  if (links !== undefined) updates.links = links;
  if (archived !== undefined)
    updates.archived_at = archived ? new Date().toISOString() : null;
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (ownerIds !== undefined) {
    const { error: deleteError } = await supabase
      .from("project_owners")
      .delete()
      .eq("project_id", id);
    if (deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    const normalizedOwnerIds = [...new Set(ownerIds)];
    if (normalizedOwnerIds.length > 0) {
      const { error: insertError } = await supabase
        .from("project_owners")
        .insert(
          normalizedOwnerIds.map((profile_id) => ({
            project_id: id,
            profile_id,
          })),
        );
      if (insertError)
        return NextResponse.json(
          { error: insertError.message },
          { status: 400 },
        );
    }
  }
  return NextResponse.json({ ok: true });
}
