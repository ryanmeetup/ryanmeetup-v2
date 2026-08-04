import { NextResponse } from "next/server";
import { categorySchema, idSchema } from "@/lib/api-schemas";
import { databaseFailure } from "@/lib/server/api-response";
import {
  apiError,
  auditPrivilegedAction,
  privilegedContext,
  readJson,
} from "@/lib/privileged-api";

export async function POST(request: Request) {
  const parsed = await readJson(request, (value) => categorySchema(value));
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;
  const { data, error } = await context.admin
    .from("work_groups")
    .insert({ ...parsed.data, created_by: context.user.id })
    .select()
    .single();
  if (error) {
    return databaseFailure(request, "category.create", error, {
      error: "The category could not be created. Try again.",
      conflictError: "A category with that name or color already exists.",
    });
  }
  if (
    !(await auditPrivilegedAction(context.admin, context.user, {
      action: "category.create",
      targetType: "category",
      targetId: data.id,
    }))
  )
    return apiError(
      500,
      "AUDIT_FAILED",
      "The category was created, but its audit record could not be saved.",
    );
  return NextResponse.json({ category: data });
}

export async function PATCH(request: Request) {
  const parsed = await readJson(request, (value) =>
    categorySchema(value, true),
  );
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;
  const { error } = await context.admin
    .from("work_groups")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      color: parsed.data.color,
    })
    .eq("id", parsed.data.id!);
  if (error) {
    return databaseFailure(request, "category.update", error, {
      error: "The category could not be updated. Try again.",
      conflictError: "A category with that name or color already exists.",
    });
  }
  if (
    !(await auditPrivilegedAction(context.admin, context.user, {
      action: "category.update",
      targetType: "category",
      targetId: parsed.data.id,
    }))
  )
    return apiError(
      500,
      "AUDIT_FAILED",
      "The category was updated, but its audit record could not be saved.",
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const parsed = await readJson(request, idSchema);
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;
  const { error } = await context.admin
    .from("work_groups")
    .delete()
    .eq("id", parsed.data.id);
  if (error) {
    return databaseFailure(request, "category.delete", error, {
      error: "The category could not be deleted. It may still be in use.",
    });
  }
  if (
    !(await auditPrivilegedAction(context.admin, context.user, {
      action: "category.delete",
      targetType: "category",
      targetId: parsed.data.id,
    }))
  )
    return apiError(
      500,
      "AUDIT_FAILED",
      "The category was deleted, but its audit record could not be saved.",
    );
  return NextResponse.json({ ok: true });
}
