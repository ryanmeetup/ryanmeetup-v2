import { NextResponse } from "next/server";
import { databaseFailure } from "@/lib/server/api-response";
import {
  apiError,
  auditPrivilegedAction,
  privilegedContext,
  readJson,
} from "@/lib/server/privileged-api";

const uuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);

export async function GET(request: Request) {
  const context = await privilegedContext();
  if ("response" in context) return context.response;
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (projectId !== null && !uuid(projectId))
    return apiError(400, "INVALID_REQUEST", "A valid project is required.");
  const { data: allowed, error: permissionError } = projectId
    ? await context.supabase.rpc("can_manage_project", {
        project_id: projectId,
      })
    : await context.supabase.rpc("is_app_owner");
  if (permissionError || !allowed)
    return apiError(403, "FORBIDDEN", "You cannot manage project visibility.");

  const [groupsResult, grantsResult, projectResult] = await Promise.all([
    context.admin
      .from("access_groups")
      .select("id,name,kind,hierarchy_rank")
      .eq("grants_global_content", false)
      .order("name"),
    projectId
      ? context.admin
          .from("project_group_grants")
          .select("group_id")
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
    projectId
      ? context.admin
          .from("projects")
          .select("access_mode")
          .eq("id", projectId)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (groupsResult.error || grantsResult.error || projectResult.error)
    return databaseFailure(
      request,
      "project-access.read",
      groupsResult.error ?? grantsResult.error ?? projectResult.error!,
      { error: "Project access settings could not be loaded." },
    );

  const availableGroupIds = new Set(groupsResult.data.map((group) => group.id));
  return NextResponse.json({
    groups: groupsResult.data,
    groupIds: grantsResult.data
      .filter((grant) => availableGroupIds.has(grant.group_id))
      .map((grant) => grant.group_id),
    accessMode: projectResult.data?.access_mode ?? "owners",
  });
}

export async function POST(request: Request) {
  const parsed = await readJson(request, (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const body = value as Record<string, unknown>;
    if (
      !uuid(body.projectId) ||
      (body.accessMode !== "owners" &&
        body.accessMode !== "open" &&
        body.accessMode !== "restricted") ||
      !Array.isArray(body.groupIds) ||
      !body.groupIds.every(uuid) ||
      (body.accessMode === "restricted" && body.groupIds.length === 0)
    )
      return null;
    return {
      projectId: body.projectId,
      accessMode: body.accessMode,
      groupIds: [...new Set(body.groupIds)],
    };
  });
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext();
  if ("response" in context) return context.response;
  const { error } = await context.supabase.rpc("set_project_visibility", {
    requested_project_id: parsed.data.projectId,
    requested_access_mode: parsed.data.accessMode,
    requested_group_ids: parsed.data.groupIds,
  });
  if (error)
    return databaseFailure(request, "project-access.update", error, {
      error: "Project visibility could not be updated.",
    });
  const audited = await auditPrivilegedAction(context.admin, context.user, {
    action: "project.access.update",
    targetType: "project",
    targetId: parsed.data.projectId,
    metadata: {
      accessMode: parsed.data.accessMode,
      groupIds: parsed.data.groupIds,
    },
  });
  if (!audited)
    return apiError(
      500,
      "AUDIT_FAILED",
      "Project visibility was saved, but its audit record could not be created.",
    );
  return NextResponse.json({ ok: true });
}
