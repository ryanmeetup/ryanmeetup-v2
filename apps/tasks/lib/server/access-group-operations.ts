import "server-only";

import type { AccessPermission } from "@/lib/access/access-types";

export type AccessGroupOperation =
  | {
      action: "group.create";
      name: string;
      description: string | null;
      color: string;
      kind: "tier" | "team";
      hierarchyRank: number | null;
      grantsGlobalContent: boolean;
      calendarAccess: boolean;
    }
  | {
      action: "group.update";
      id: string;
      name: string;
      description: string | null;
      color: string;
      kind: "tier" | "team";
      hierarchyRank: number | null;
      grantsGlobalContent: boolean;
      calendarAccess: boolean;
    }
  | { action: "group.delete"; id: string }
  | {
      action: "member.set" | "tier.set" | "member.delete";
      groupId: string;
      profileId: string;
    }
  | {
      action: "grant.set";
      groupId: string;
      projectId: string;
      permission: AccessPermission;
    }
  | { action: "grant.delete"; groupId: string; projectId: string };

const uuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
const hexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
const groupShape = (body: Record<string, unknown>) =>
  (body.kind === "team" &&
    body.hierarchyRank === null &&
    body.grantsGlobalContent === false) ||
  (body.kind === "tier" &&
    Number.isInteger(body.hierarchyRank) &&
    Number(body.hierarchyRank) >= 0 &&
    typeof body.grantsGlobalContent === "boolean");

export function accessGroupOperationSchema(
  value: unknown,
): AccessGroupOperation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (
    (body.action === "group.create" || body.action === "group.update") &&
    (body.action === "group.create" || uuid(body.id)) &&
    typeof body.name === "string" &&
    body.name.trim() &&
    body.name.length <= 100 &&
    hexColor(body.color) &&
    groupShape(body) &&
    typeof body.calendarAccess === "boolean" &&
    (body.description === null || typeof body.description === "string")
  ) {
    return {
      action: body.action,
      ...(body.action === "group.update" ? { id: body.id as string } : {}),
      name: body.name.trim().slice(0, 100),
      color: body.color.toLowerCase(),
      kind: body.kind as "tier" | "team",
      hierarchyRank: body.hierarchyRank as number | null,
      grantsGlobalContent: body.grantsGlobalContent as boolean,
      calendarAccess: body.calendarAccess,
      description: body.description
        ? String(body.description).trim().slice(0, 500)
        : null,
    } as AccessGroupOperation;
  }
  if (body.action === "group.delete" && uuid(body.id))
    return { action: body.action, id: body.id };
  if (
    (body.action === "member.set" ||
      body.action === "member.delete" ||
      body.action === "tier.set") &&
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
      permission: body.permission as AccessPermission,
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
