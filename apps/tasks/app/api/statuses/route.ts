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
  const { data, error } = await context.admin.rpc("create_status", {
    status_name: parsed.data.name,
    status_color: parsed.data.color,
  }).single();
  if (error || !data || typeof data !== "object" || !("id" in data) || typeof data.id !== "string") {
    console.error("Status creation failed", { actorId: context.user.id, code: error?.code });
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
    const { data, error } = await context.admin.rpc("reorder_statuses", {
      ordered_status_ids: orderedIds,
      expected_revision: parsed.data.expectedRevision,
    });
    if (error) {
      console.error("Status reorder failed", { actorId: context.user.id, code: error.code });
      if (error.code === "40001" || error.code === "P0002")
        return apiError(409, "CONFLICT", "The status list changed. Refresh and try again.");
      return apiError(400, "OPERATION_FAILED", "The statuses could not be reordered.");
    }
    if (!(await auditPrivilegedAction(context.admin, context.user, {
      action: "status.reorder", targetType: "status_collection", metadata: { count: orderedIds.length },
    }))) return apiError(500, "AUDIT_FAILED", "The statuses were reordered, but the audit record could not be saved.");
    return NextResponse.json({ statuses: data ?? [] });
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
  const { data, error } = await context.admin.rpc("delete_status", {
    status_id: parsed.data.id,
  }).single();
  if (error || !data || typeof data !== "object" || !("id" in data) || typeof data.id !== "string") {
    console.error("Status deletion failed", { actorId: context.user.id, code: error?.code });
    return apiError(400, "OPERATION_FAILED", "The status could not be deleted.");
  }
  if (!(await auditPrivilegedAction(context.admin, context.user, {
    action: "status.delete", targetType: "status", targetId: parsed.data.id,
  }))) return apiError(500, "AUDIT_FAILED", "The status was deleted, but its audit record could not be saved.");
  return NextResponse.json({ id: data.id });
}
