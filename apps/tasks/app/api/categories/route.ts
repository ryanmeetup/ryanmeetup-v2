import { NextResponse } from "next/server";
import { categorySchema } from "@/lib/api-schemas";
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
  const { ownerIds, ...categoryInput } = parsed.data;
  const { data, error } = await context.admin
    .from("work_groups")
    .insert({ ...categoryInput, created_by: context.user.id })
    .select()
    .single();
  if (error) {
    return databaseFailure(request, "category.create", error, {
      error: "The category could not be created. Try again.",
      conflictError: "A category with that name or color already exists.",
    });
  }
  const { error: ownersError } = await context.admin
    .from("category_owners")
    .insert(
      ownerIds!.map((profile_id) => ({
        category_id: data.id,
        profile_id,
      })),
    );
  if (ownersError)
    return databaseFailure(request, "category-owners.create", ownersError, {
      error: "The category was created, but its owners could not be saved.",
    });
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
      links: parsed.data.links,
      tags: parsed.data.tags,
      ...(parsed.data.archived !== undefined
        ? {
            archived_at: parsed.data.archived ? new Date().toISOString() : null,
          }
        : {}),
    })
    .eq("id", parsed.data.id!);
  if (error) {
    return databaseFailure(request, "category.update", error, {
      error: "The category could not be updated. Try again.",
      conflictError: "A category with that name or color already exists.",
    });
  }
  if (parsed.data.ownerIds !== undefined) {
    const { error: clearError } = await context.admin
      .from("category_owners")
      .delete()
      .eq("category_id", parsed.data.id!);
    if (clearError)
      return databaseFailure(request, "category-owners.clear", clearError, {
        error: "The category owners could not be updated. Try again.",
      });
    const { error: ownersError } = await context.admin
      .from("category_owners")
      .insert(
        parsed.data.ownerIds.map((profile_id) => ({
          category_id: parsed.data.id!,
          profile_id,
        })),
      );
    if (ownersError)
      return databaseFailure(request, "category-owners.update", ownersError, {
        error: "The category owners could not be updated. Try again.",
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
