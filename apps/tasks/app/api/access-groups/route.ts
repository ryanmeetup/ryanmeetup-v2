import { NextResponse } from "next/server";
import { databaseFailure } from "@/lib/server/api-response";
import {
  apiError,
  auditPrivilegedAction,
  privilegedContext,
  readJson,
} from "@/lib/privileged-api";

type Operation =
  | { action: "group.create"; name: string; description: string | null }
  | {
      action: "group.update";
      id: string;
      name: string;
      description: string | null;
    }
  | { action: "group.delete"; id: string }
  | { action: "member.set"; groupId: string; profileId: string }
  | { action: "member.delete"; groupId: string; profileId: string }
  | {
      action: "grant.set";
      groupId: string;
      projectId: string;
      permission: "viewer" | "editor" | "manager";
    }
  | { action: "grant.delete"; groupId: string; projectId: string };

const uuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
function schema(value: unknown): Operation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (
    body.action === "group.create" &&
    typeof body.name === "string" &&
    body.name.trim() &&
    body.name.length <= 100 &&
    (body.description === null || typeof body.description === "string")
  )
    return {
      action: body.action,
      name: body.name.trim(),
      description: body.description
        ? String(body.description).trim().slice(0, 500)
        : null,
    };
  if (
    body.action === "group.update" &&
    uuid(body.id) &&
    typeof body.name === "string" &&
    body.name.trim() &&
    (body.description === null || typeof body.description === "string")
  )
    return {
      action: body.action,
      id: body.id,
      name: body.name.trim().slice(0, 100),
      description: body.description
        ? String(body.description).trim().slice(0, 500)
        : null,
    };
  if (body.action === "group.delete" && uuid(body.id))
    return { action: body.action, id: body.id };
  if (
    (body.action === "member.set" || body.action === "member.delete") &&
    uuid(body.groupId) &&
    uuid(body.profileId)
  )
    return {
      action: body.action,
      groupId: body.groupId,
      profileId: body.profileId,
    };
  if (
    body.action === "grant.set" &&
    uuid(body.groupId) &&
    uuid(body.projectId) &&
    ["viewer", "editor", "manager"].includes(String(body.permission))
  )
    return {
      action: body.action,
      groupId: body.groupId,
      projectId: body.projectId,
      permission: body.permission as "viewer" | "editor" | "manager",
    };
  if (
    body.action === "grant.delete" &&
    uuid(body.groupId) &&
    uuid(body.projectId)
  )
    return {
      action: body.action,
      groupId: body.groupId,
      projectId: body.projectId,
    };
  return null;
}

export async function POST(request: Request) {
  const parsed = await readJson(request, schema);
  if ("response" in parsed) return parsed.response;
  const context = await privilegedContext({ owner: true });
  if ("response" in context) return context.response;
  const operation = parsed.data;
  let result: unknown;
  let targetId: string | null = null;
  let error: {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  } | null = null;
  if (operation.action === "group.create") {
    const response = await context.admin
      .from("access_groups")
      .insert({
        name: operation.name,
        description: operation.description,
        created_by: context.user.id,
      })
      .select("*")
      .single();
    result = { group: response.data };
    error = response.error;
    targetId = response.data?.id ?? null;
  } else if (operation.action === "group.update") {
    const response = await context.admin
      .from("access_groups")
      .update({ name: operation.name, description: operation.description })
      .eq("id", operation.id)
      .select("*")
      .single();
    result = { group: response.data };
    error = response.error;
    targetId = operation.id;
  } else if (operation.action === "group.delete") {
    const response = await context.admin
      .from("access_groups")
      .delete()
      .eq("id", operation.id);
    error = response.error;
    result = { id: operation.id };
    targetId = operation.id;
  } else if (operation.action === "member.set") {
    const response = await context.admin
      .from("access_group_members")
      .upsert({
        group_id: operation.groupId,
        profile_id: operation.profileId,
        added_by: context.user.id,
      })
      .select("*")
      .single();
    result = { member: response.data };
    error = response.error;
    targetId = operation.groupId;
  } else if (operation.action === "member.delete") {
    const response = await context.admin
      .from("access_group_members")
      .delete()
      .eq("group_id", operation.groupId)
      .eq("profile_id", operation.profileId);
    error = response.error;
    result = { profileId: operation.profileId };
    targetId = operation.groupId;
  } else if (operation.action === "grant.set") {
    const response = await context.admin
      .from("project_group_grants")
      .upsert({
        group_id: operation.groupId,
        project_id: operation.projectId,
        permission: operation.permission,
        granted_by: context.user.id,
      })
      .select("*")
      .single();
    result = { grant: response.data };
    error = response.error;
    targetId = operation.groupId;
  } else {
    const response = await context.admin
      .from("project_group_grants")
      .delete()
      .eq("group_id", operation.groupId)
      .eq("project_id", operation.projectId);
    error = response.error;
    result = { projectId: operation.projectId };
    targetId = operation.groupId;
  }
  if (error) {
    return databaseFailure(request, `access.${operation.action}`, error, {
      error: "The access change could not be saved. Refresh and try again.",
      conflictError: "That access setting already exists.",
    });
  }
  const audited = await auditPrivilegedAction(context.admin, context.user, {
    action: operation.action,
    targetType: "access_group",
    targetId,
  });
  if (!audited)
    return apiError(
      500,
      "AUDIT_FAILED",
      "The access change was saved, but its audit record could not be created.",
    );
  return NextResponse.json(result);
}
