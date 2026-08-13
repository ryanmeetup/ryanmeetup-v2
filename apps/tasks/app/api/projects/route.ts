import { NextResponse } from "next/server";
import { projectCreateSchema, projectPatchSchema } from "@/lib/api-schemas";
import { databaseFailure, notFound } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import { readJson } from "@/lib/server/request";
import type { ProjectLink } from "@/lib/resource-types";

export async function POST(request: Request) {
  const parsed = await readJson(request, projectCreateSchema);
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ owner: true, onboarded: true });
  if ("response" in authorization) return authorization.response;
  const { data, error } = await authorization.supabase
    .from("projects")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description,
      links: parsed.data.links,
      created_by: authorization.user.id,
    })
    .select()
    .single();
  if (error)
    return databaseFailure(request, "project.create", error, {
      error: "The project could not be created. Try again.",
      conflictError: "A project with that name already exists.",
    });
  if (parsed.data.ownerIds.length) {
    const { error: ownersError } = await authorization.supabase
      .from("project_owners")
      .insert(
        parsed.data.ownerIds.map((profile_id) => ({
          project_id: data.id,
          profile_id,
        })),
      );
    if (ownersError)
      return databaseFailure(request, "project-owners.create", ownersError, {
        error: "The project was created, but its owners could not be saved.",
      });
  }
  return NextResponse.json({ project: data });
}

export async function PATCH(request: Request) {
  const parsed = await readJson(request, projectPatchSchema);
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const { supabase } = authorization;
  const { data: canManage, error: permissionError } = await supabase.rpc(
    "can_manage_project",
    { project_id: parsed.data.id },
  );
  if (permissionError)
    return databaseFailure(request, "project.permission", permissionError, {
      error: "Project permissions are temporarily unavailable.",
    });
  if (!canManage) return notFound();
  const updates: {
    name?: string;
    description?: string | null;
    archived_at?: string | null;
    links?: ProjectLink[];
  } = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    updates.description = parsed.data.description || null;
  if (parsed.data.links !== undefined) updates.links = parsed.data.links;
  if (parsed.data.archived !== undefined)
    updates.archived_at = parsed.data.archived
      ? new Date().toISOString()
      : null;
  if (Object.keys(updates).length) {
    const { error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", parsed.data.id);
    if (error)
      return databaseFailure(request, "project.update", error, {
        error: "The project could not be updated. Try again.",
        conflictError: "A project with that name already exists.",
      });
  }
  if (parsed.data.ownerIds !== undefined) {
    const { error: deleteError } = await supabase
      .from("project_owners")
      .delete()
      .eq("project_id", parsed.data.id);
    if (deleteError)
      return databaseFailure(request, "project-owners.clear", deleteError, {
        error: "The project owners could not be updated. Try again.",
      });
    if (parsed.data.ownerIds.length) {
      const { error: insertError } = await supabase
        .from("project_owners")
        .insert(
          parsed.data.ownerIds.map((profile_id) => ({
            project_id: parsed.data.id,
            profile_id,
          })),
        );
      if (insertError)
        return databaseFailure(request, "project-owners.update", insertError, {
          error: "The project owners could not be updated. Try again.",
        });
    }
  }
  return NextResponse.json({ ok: true });
}
