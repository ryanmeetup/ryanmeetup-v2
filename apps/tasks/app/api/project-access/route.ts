import { NextResponse } from "next/server";
import { databaseFailure } from "@/lib/server/api-response";
import {
  apiError,
  privilegedContext,
} from "@/lib/server/privileged-api";

const uuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);

export async function GET(request: Request) {
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (projectId !== null && !uuid(projectId))
    return apiError(400, "INVALID_REQUEST", "A valid project is required.");

  const [groupsResult, grantsResult] = await Promise.all([
    context.admin
      .from("access_groups")
      .select("id,name,kind,hierarchy_rank")
      .eq("grants_global_content", false)
      .order("name"),
    projectId
      ? context.admin
          .from("project_group_grants")
          .select("group_id,permission")
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (groupsResult.error || grantsResult.error)
    return databaseFailure(
      request,
      "project-access.read",
      groupsResult.error ?? grantsResult.error!,
      { error: "Project access settings could not be loaded." },
    );

  const availableGroupIds = new Set(groupsResult.data.map((group) => group.id));
  return NextResponse.json({
    groups: groupsResult.data,
    grants: grantsResult.data
      .filter((grant) => availableGroupIds.has(grant.group_id))
      .map((grant) => ({
        groupId: grant.group_id,
        permission: grant.permission,
      })),
  });
}
