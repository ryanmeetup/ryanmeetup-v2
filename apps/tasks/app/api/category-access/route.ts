import { NextResponse } from "next/server";
import { isJsonObject, isUuid } from "@/lib/api-schema/shared";
import { databaseFailure } from "@/lib/server/api-response";
import {
  apiError,
  auditPrivilegedAction,
  privilegedContext,
  readJson,
  recordWorkspaceActivity,
} from "@/lib/server/privileged-api";

export async function GET(request: Request) {
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;
  const categoryId = new URL(request.url).searchParams.get("categoryId");
  if (categoryId !== null && !isUuid(categoryId))
    return apiError(400, "INVALID_REQUEST", "A valid category is required.");

  const [groupsResult, grantsResult] = await Promise.all([
    context.admin
      .from("access_groups")
      .select("id,name,kind,hierarchy_rank,grants_global_content")
      .eq("grants_global_content", false)
      .order("name"),
    categoryId
      ? context.admin
          .from("category_group_grants")
          .select("group_id")
          .eq("category_id", categoryId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (groupsResult.error || grantsResult.error)
    return databaseFailure(
      request,
      "category-access.read",
      groupsResult.error ?? grantsResult.error!,
      { error: "Category access settings could not be loaded." },
    );
  return NextResponse.json({
    groups: groupsResult.data,
    groupIds: grantsResult.data.map((grant) => grant.group_id),
  });
}

export async function POST(request: Request) {
  const parsed = await readJson(request, (value) => {
    if (!isJsonObject(value)) return null;
    const body = value;
    if (
      !isUuid(body.categoryId) ||
      (body.accessMode !== "open" && body.accessMode !== "restricted") ||
      !Array.isArray(body.groupIds) ||
      !body.groupIds.every(isUuid)
    )
      return null;
    return {
      categoryId: body.categoryId,
      accessMode: body.accessMode,
      groupIds: [...new Set(body.groupIds)],
    };
  });
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;
  const { error } = await context.supabase.rpc("set_category_access", {
    requested_category_id: parsed.data.categoryId,
    requested_access_mode: parsed.data.accessMode,
    requested_group_ids: parsed.data.groupIds,
  });
  if (error)
    return databaseFailure(request, "category-access.update", error, {
      error: "Category access could not be updated.",
    });
  const audited = await auditPrivilegedAction(context.admin, context.user, {
    action: "category.access.update",
    targetType: "category",
    targetId: parsed.data.categoryId,
    metadata: {
      accessMode: parsed.data.accessMode,
      groupIds: parsed.data.groupIds,
    },
  });
  if (!audited)
    return apiError(
      500,
      "AUDIT_FAILED",
      "Category access was saved, but its audit record could not be created.",
    );
  const { data: category } = await context.supabase
    .from("work_groups")
    .select("name")
    .eq("id", parsed.data.categoryId)
    .maybeSingle();
  await recordWorkspaceActivity(context.admin, context.user, {
    action: "category.access.update",
    targetType: "category",
    targetId: parsed.data.categoryId,
    metadata: {
      resource_name: category?.name,
      resource_href: "/categories",
      detail: `Now ${parsed.data.accessMode}`,
    },
  });
  return NextResponse.json({ ok: true });
}
