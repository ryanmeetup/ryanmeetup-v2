import { NextResponse } from "next/server";
import { idSchema, statusCreateSchema, statusPatchSchema } from "@/lib/api-schemas";
import {
  apiError,
  auditPrivilegedAction,
  privilegedContext,
  readJson,
} from "@/lib/privileged-api";

export async function POST(request: Request) {
  const parsed = await readJson(request, statusCreateSchema);
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;
  const { data: finalStatus, error: readError } = await context.admin
    .from("statuses").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  if (readError) {
    console.error("Status ordering read failed", { actorId: context.user.id, code: readError.code });
    return apiError(500, "OPERATION_FAILED", "The status could not be created.");
  }
  const { data, error } = await context.admin.from("statuses").insert({
    name: parsed.data.name,
    color: parsed.data.color,
    sort_order: (finalStatus?.sort_order ?? -1) + 1,
    is_default: false,
    is_completed: false,
  }).select("*").single();
  if (error) {
    console.error("Status creation failed", { actorId: context.user.id, code: error.code });
    return apiError(400, "OPERATION_FAILED", "The status could not be created.");
  }
  if (!(await auditPrivilegedAction(context.admin, context.user, {
    action: "status.create", targetType: "status", targetId: data.id,
  }))) return apiError(500, "AUDIT_FAILED", "The status was created, but its audit record could not be saved.");
  return NextResponse.json({ status: data });
}

export async function PATCH(request: Request) {
  const parsed = await readJson(request, statusPatchSchema);
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;

  if (Array.isArray(parsed.data.orderedIds)) {
    const orderedIds = [...new Set(parsed.data.orderedIds)];
    if (orderedIds.length !== parsed.data.orderedIds.length)
      return apiError(400, "INVALID_REQUEST", "Each status must appear once.");
    const { data: statuses, error: readError } = await context.admin.from("statuses").select("*");
    if (readError) {
      console.error("Status reorder read failed", { actorId: context.user.id, code: readError.code });
      return apiError(500, "OPERATION_FAILED", "The statuses could not be reordered.");
    }
    if (statuses.length !== orderedIds.length || statuses.some((status) => !orderedIds.includes(status.id)))
      return apiError(409, "CONFLICT", "The status list changed. Refresh and try again.");
    const order = new Map(orderedIds.map((id, index) => [id, index]));
    const { data, error } = await context.admin.from("statuses").upsert(
      statuses.map((status) => ({ ...status, sort_order: order.get(status.id) })),
    ).select("*");
    if (error) {
      console.error("Status reorder failed", { actorId: context.user.id, code: error.code });
      return apiError(400, "OPERATION_FAILED", "The statuses could not be reordered.");
    }
    if (!(await auditPrivilegedAction(context.admin, context.user, {
      action: "status.reorder", targetType: "status_collection", metadata: { count: orderedIds.length },
    }))) return apiError(500, "AUDIT_FAILED", "The statuses were reordered, but the audit record could not be saved.");
    return NextResponse.json({ statuses: data });
  }

  const updates = {
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    ...(parsed.data.isCompleted !== undefined ? { is_completed: parsed.data.isCompleted } : {}),
  };
  const { data, error } = await context.admin.from("statuses").update(updates)
    .eq("id", parsed.data.id).select("*").single();
  if (error) {
    console.error("Status update failed", { actorId: context.user.id, code: error.code });
    return apiError(400, "OPERATION_FAILED", "The status could not be updated.");
  }
  if (!(await auditPrivilegedAction(context.admin, context.user, {
    action: "status.update", targetType: "status", targetId: parsed.data.id,
  }))) return apiError(500, "AUDIT_FAILED", "The status was updated, but its audit record could not be saved.");
  return NextResponse.json({ status: data });
}

export async function DELETE(request: Request) {
  const parsed = await readJson(request, idSchema);
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;
  const { data, error } = await context.admin.from("statuses").delete()
    .eq("id", parsed.data.id).select("id").single();
  if (error) {
    console.error("Status deletion failed", { actorId: context.user.id, code: error.code });
    return apiError(400, "OPERATION_FAILED", "The status could not be deleted.");
  }
  if (!(await auditPrivilegedAction(context.admin, context.user, {
    action: "status.delete", targetType: "status", targetId: parsed.data.id,
  }))) return apiError(500, "AUDIT_FAILED", "The status was deleted, but its audit record could not be saved.");
  return NextResponse.json({ id: data.id });
}
