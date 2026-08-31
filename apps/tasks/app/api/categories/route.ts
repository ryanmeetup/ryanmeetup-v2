import { NextResponse } from "next/server";
import { categorySchema, idSchema } from "@/lib/api-schema";
import { apiError, databaseFailure } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import { readJson } from "@/lib/server/request";

async function categoryManagerContext() {
  const context = await authorize();
  if ("response" in context) return context;
  const { data, error } = await context.supabase.rpc("can_manage_categories");
  if (error || !data)
    return {
      response: apiError(
        403,
        "FORBIDDEN",
        "You do not have permission to manage categories.",
      ),
    };
  return context;
}

export async function POST(request: Request) {
  const parsed = await readJson(request, (value) => categorySchema(value));
  if ("response" in parsed) return parsed.response;
  const context = await categoryManagerContext();
  if ("response" in context) return context.response;
  const { ownerIds, accessMode, accessGroupIds, ...categoryInput } =
    parsed.data;
  const { data: isOwner } = await context.supabase.rpc("is_app_owner");
  if ((accessMode !== undefined || accessGroupIds !== undefined) && !isOwner)
    return apiError(
      403,
      "FORBIDDEN",
      "Only app owners may configure category access.",
    );
  const { data, error } = await context.supabase.rpc(
    "create_category_with_owners",
    {
      requested_name: categoryInput.name,
      requested_description: categoryInput.description,
      requested_color: categoryInput.color,
      requested_links: categoryInput.links,
      requested_tags: categoryInput.tags,
      requested_owner_ids: ownerIds!,
      requested_access_mode: accessMode ?? null,
      requested_group_ids: accessGroupIds ?? [],
    },
  );
  if (error) {
    return databaseFailure(request, "category.create", error, {
      error: "The category could not be created. Try again.",
      conflictError: "A category with that name or color already exists.",
    });
  }
  const category = Array.isArray(data) ? data[0] : data;
  if (!category)
    return apiError(
      500,
      "OPERATION_FAILED",
      "The category could not be created. Try again.",
    );
  return NextResponse.json({ category });
}

export async function PATCH(request: Request) {
  const parsed = await readJson(request, (value) =>
    categorySchema(value, true),
  );
  if ("response" in parsed) return parsed.response;
  const context = await categoryManagerContext();
  if ("response" in context) return context.response;
  const { id, ...values } = parsed.data;
  const { error } = await context.supabase.rpc("update_category_with_owners", {
    requested_category_id: id!,
    requested_values: values,
  });
  if (error) {
    return databaseFailure(request, "category.update", error, {
      error: "The category could not be updated. Try again.",
      conflictError: "A category with that name or color already exists.",
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const parsed = await readJson(request, idSchema);
  if ("response" in parsed) return parsed.response;
  const context = await categoryManagerContext();
  if ("response" in context) return context.response;
  const categoryResult = await context.supabase
    .from("work_groups")
    .select("id,name")
    .eq("id", parsed.data.id)
    .single();
  if (categoryResult.error)
    return apiError(404, "NOT_FOUND", "Category not found.");
  const { count, error: countError } = await context.supabase
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
  const { error } = await context.supabase
    .from("work_groups")
    .delete()
    .eq("id", parsed.data.id);
  if (error)
    return databaseFailure(request, "category.delete", error, {
      error: "The category could not be deleted. Try again.",
    });
  return NextResponse.json({ ok: true });
}
