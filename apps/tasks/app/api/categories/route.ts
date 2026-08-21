import { NextResponse } from "next/server";
import { categorySchema, idSchema } from "@/lib/api-schema";
import { databaseFailure } from "@/lib/server/api-response";
import {
  apiError,
  privilegedContext,
  recordWorkspaceActivity,
  readJson,
} from "@/lib/server/privileged-api";

async function categoryManagerContext() {
  const context = await privilegedContext();
  if ("response" in context) return context;
  const { data, error } = await context.supabase.rpc("can_manage_categories");
  if (error || !data) return { response: apiError(403, "FORBIDDEN", "You do not have permission to manage categories.") };
  return context;
}

export async function POST(request: Request) {
  const parsed = await readJson(request, (value) => categorySchema(value));
  if ("response" in parsed) return parsed.response;
  const context = await categoryManagerContext();
  if ("response" in context) return context.response;
  const { ownerIds, accessMode, accessGroupIds, ...categoryInput } = parsed.data;
  const { data: isOwner } = await context.supabase.rpc("is_app_owner");
  if ((accessMode !== undefined || accessGroupIds !== undefined) && !isOwner)
    return apiError(
      403,
      "FORBIDDEN",
      "Only app owners may configure category access.",
    );
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
  if (isOwner && accessMode) {
    const { error: accessError } = await context.supabase.rpc(
      "set_category_access",
      {
        requested_category_id: data.id,
        requested_access_mode: accessMode,
        requested_group_ids: accessGroupIds ?? [],
      },
    );
    if (accessError) {
      await context.admin.from("work_groups").delete().eq("id", data.id);
      return databaseFailure(request, "category-access.create", accessError, {
        error: "The category access settings could not be saved.",
      });
    }
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
    !(await recordWorkspaceActivity(context.user, {
      action: "category.create",
      targetType: "category",
      targetId: data.id,
      name: data.name,
      href: "/categories",
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
  const context = await categoryManagerContext();
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
    !(await recordWorkspaceActivity(context.user, {
      action:
        parsed.data.archived === true
          ? "category.archive"
          : parsed.data.archived === false
            ? "category.restore"
            : "category.update",
      targetType: "category",
      targetId: parsed.data.id,
      name: parsed.data.name,
      href: "/categories",
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
  const context = await categoryManagerContext();
  if ("response" in context) return context.response;
  const categoryResult = await context.admin
    .from("work_groups")
    .select("id,name")
    .eq("id", parsed.data.id)
    .single();
  if (categoryResult.error)
    return apiError(404, "NOT_FOUND", "Category not found.");
  const { count, error: countError } = await context.admin
    .from("task_categories")
    .select("task_id", { count: "exact", head: true })
    .eq("category_id", parsed.data.id);
  if (countError)
    return databaseFailure(request, "category.delete-check", countError, {
      error: "The category could not be checked for tasks. Try again.",
    });
  if (count)
    return apiError(
      409,
      "CONFLICT",
      "Remove this category from every task before deleting it.",
    );
  const { error } = await context.admin
    .from("work_groups")
    .delete()
    .eq("id", parsed.data.id);
  if (error)
    return databaseFailure(request, "category.delete", error, {
      error: "The category could not be deleted. Try again.",
    });
  await recordWorkspaceActivity(context.user, {
    action: "category.delete",
    targetType: "category",
    targetId: parsed.data.id,
    name: categoryResult.data.name,
    href: "/categories",
  });
  return NextResponse.json({ ok: true });
}
