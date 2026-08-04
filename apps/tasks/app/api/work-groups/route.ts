import { NextResponse } from "next/server";
import { idSchema, workGroupSchema } from "@/lib/api-schemas";
import {
  apiError,
  auditPrivilegedAction,
  privilegedContext,
  readJson,
} from "@/lib/privileged-api";

export async function POST(request: Request) {
  const parsed = await readJson(request, (value) => workGroupSchema(value));
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;
  const { data, error } = await context.admin.from("work_groups").insert({
    name: parsed.data.name,
    description: parsed.data.description,
    color: parsed.data.color,
    created_by: context.user.id,
  }).select().single();
  if (error) {
    console.error("Work group creation failed", { actorId: context.user.id, code: error.code });
    return apiError(400, "OPERATION_FAILED", "The category could not be created.");
  }
  if (!(await auditPrivilegedAction(context.admin, context.user, {
    action: "work_group.create", targetType: "work_group", targetId: data.id,
  }))) return apiError(500, "AUDIT_FAILED", "The category was created, but its audit record could not be saved.");
  return NextResponse.json({ workGroup: data });
}

export async function PATCH(request: Request) {
  const parsed = await readJson(request, (value) => workGroupSchema(value, true));
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;
  const { error } = await context.admin.from("work_groups").update({
    name: parsed.data.name, description: parsed.data.description, color: parsed.data.color,
  }).eq("id", parsed.data.id!);
  if (error) {
    console.error("Work group update failed", { actorId: context.user.id, code: error.code });
    return apiError(400, "OPERATION_FAILED", "The category could not be updated.");
  }
  if (!(await auditPrivilegedAction(context.admin, context.user, {
    action: "work_group.update", targetType: "work_group", targetId: parsed.data.id,
  }))) return apiError(500, "AUDIT_FAILED", "The category was updated, but its audit record could not be saved.");
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const parsed = await readJson(request, idSchema);
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;
  const { error } = await context.admin.from("work_groups").delete().eq("id", parsed.data.id);
  if (error) {
    console.error("Work group deletion failed", { actorId: context.user.id, code: error.code });
    return apiError(400, "OPERATION_FAILED", "The category could not be deleted.");
  }
  if (!(await auditPrivilegedAction(context.admin, context.user, {
    action: "work_group.delete", targetType: "work_group", targetId: parsed.data.id,
  }))) return apiError(500, "AUDIT_FAILED", "The category was deleted, but its audit record could not be saved.");
  return NextResponse.json({ ok: true });
}
