import { NextResponse } from "next/server";
import {
  idSchema,
  projectCreateSchema,
  projectPatchSchema,
} from "@/lib/api-schema";
import { apiError, databaseFailure, notFound } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import { readJson } from "@/lib/server/request";
import type { ProjectLink } from "@/lib/resources/resource-types";
import { recordWorkspaceActivity } from "@/lib/server/privileged-api";

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
  if (
    !(await recordWorkspaceActivity(authorization.user, {
      action: "project.create",
      targetType: "project",
      targetId: data.id,
      name: data.name,
      href: "/projects",
      projectId: data.id,
    }))
  )
    return NextResponse.json(
      { error: "The project was created, but its activity could not be recorded." },
      { status: 500 },
    );
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
  const projectResult = await supabase
    .from("projects")
    .select("id,name")
    .eq("id", parsed.data.id)
    .single();
  if (projectResult.error)
    return databaseFailure(request, "project.activity-target", projectResult.error, {
      error: "The project was updated, but its activity could not be recorded.",
    });
  const action =
    parsed.data.archived === true
      ? "project.archive"
      : parsed.data.archived === false
        ? "project.restore"
        : "project.update";
  if (
    !(await recordWorkspaceActivity(authorization.user, {
      action,
      targetType: "project",
      targetId: parsed.data.id,
      name: projectResult.data.name,
      href: "/projects",
      projectId: parsed.data.id,
    }))
  )
    return NextResponse.json(
      { error: "The project was updated, but its activity could not be recorded." },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const parsed = await readJson(request, idSchema);
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
  const projectResult = await supabase
    .from("projects")
    .select("id,name")
    .eq("id", parsed.data.id)
    .single();
  if (projectResult.error) return notFound();
  const { count, error: countError } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", parsed.data.id);
  if (countError)
    return databaseFailure(request, "project.delete-check", countError, {
      error: "The project could not be checked for tasks. Try again.",
    });
  if (count)
    return apiError(
      409,
      "CONFLICT",
      "Move or delete every task in this project before deleting it.",
    );
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", parsed.data.id);
  if (error)
    return databaseFailure(request, "project.delete", error, {
      error: "The project could not be deleted. Try again.",
    });
  await recordWorkspaceActivity(authorization.user, {
    action: "project.delete",
    targetType: "project",
    targetId: parsed.data.id,
    name: projectResult.data.name,
    href: "/projects",
  });
  return NextResponse.json({ ok: true });
}
