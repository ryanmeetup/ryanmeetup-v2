import type { Priority, ProjectLink, Task } from "./types";
import { normalizeHttpUrl } from "@ryanmeetup/utils";

type JsonObject = Record<string, unknown>;

const objectWithKeys = (
  value: unknown,
  keys: readonly string[],
): JsonObject | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const object = value as JsonObject;
  return Object.keys(object).every((key) => keys.includes(key)) ? object : null;
};

const text = (value: unknown, max: number, required = true) => {
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : null;
};
const optionalText = (value: unknown, max: number) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length <= max ? normalized : null;
};
const uuid = (value: unknown) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;
const color = (value: unknown) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : null;

export const colorSchema = color;

export function statusCreateSchema(value: unknown) {
  const body = objectWithKeys(value, ["name", "color"]);
  if (!body) return null;
  const name = text(body.name, 80);
  const validColor = color(body.color);
  return name && validColor ? { name, color: validColor } : null;
}

export function statusPatchSchema(value: unknown) {
  const body = objectWithKeys(value, [
    "id",
    "name",
    "isCompleted",
    "orderedIds",
    "expectedRevision",
  ]);
  if (!body) return null;
  if (body.orderedIds !== undefined) {
    if (!Array.isArray(body.orderedIds) || body.orderedIds.length > 100)
      return null;
    const orderedIds = body.orderedIds.map(uuid);
    const expectedRevision = body.expectedRevision;
    return orderedIds.every(Boolean) &&
      typeof expectedRevision === "number" &&
      Number.isSafeInteger(expectedRevision) &&
      expectedRevision >= 0
      ? { orderedIds: orderedIds as string[], expectedRevision }
      : null;
  }
  const id = uuid(body.id);
  const name = body.name === undefined ? undefined : text(body.name, 80);
  const isCompleted = body.isCompleted;
  if (
    !id ||
    name === null ||
    (isCompleted !== undefined && typeof isCompleted !== "boolean")
  )
    return null;
  if (name === undefined && isCompleted === undefined) return null;
  return { id, name, isCompleted: isCompleted as boolean | undefined };
}

export function idSchema(value: unknown) {
  const body = objectWithKeys(value, ["id"]);
  const id = body && uuid(body.id);
  return id ? { id } : null;
}

export function categorySchema(value: unknown, requireId = false) {
  const body = objectWithKeys(value, [
    "id",
    "name",
    "description",
    "color",
    "links",
    "archived",
  ]);
  if (!body) return null;
  const id = requireId ? uuid(body.id) : undefined;
  const name = text(body.name, 80);
  const description = optionalText(body.description, 500);
  const validColor = color(body.color);
  const links = projectLinks(body.links ?? []);
  const archived = body.archived;
  if (
    (requireId && !id) ||
    !name ||
    description === null ||
    (!requireId && !description) ||
    !validColor ||
    !links ||
    (archived !== undefined && typeof archived !== "boolean")
  )
    return null;
  return {
    id,
    name,
    description: description || null,
    color: validColor,
    links,
    archived: archived as boolean | undefined,
  };
}

export function inviteSchema(value: unknown) {
  const body = objectWithKeys(value, ["email", "fullName"]);
  if (!body) return null;
  const email = text(body.email, 254);
  const fullName = optionalText(body.fullName, 100);
  if (!email || fullName === null || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return null;
  return { email: email.toLowerCase(), fullName };
}

export function userDeleteSchema(value: unknown) {
  const body = objectWithKeys(value, ["userId"]);
  const userId = body && uuid(body.userId);
  return userId ? { userId } : null;
}

export function profileSchema(value: unknown) {
  const body = objectWithKeys(value, [
    "displayName",
    "avatarPath",
    "taskDetailsOpenByDefault",
  ]);
  if (
    !body ||
    typeof body.displayName !== "string" ||
    body.displayName.length > 200
  )
    return null;
  if (
    body.avatarPath !== undefined &&
    (typeof body.avatarPath !== "string" || body.avatarPath.length > 200)
  )
    return null;
  if (typeof body.taskDetailsOpenByDefault !== "boolean") return null;
  return {
    displayName: body.displayName,
    avatarPath: body.avatarPath as string | undefined,
    taskDetailsOpenByDefault: body.taskDetailsOpenByDefault,
  };
}

function projectLinks(value: unknown): ProjectLink[] | null {
  if (!Array.isArray(value) || value.length > 10) return null;
  const links: ProjectLink[] = [];
  for (const item of value) {
    const body = objectWithKeys(item, ["label", "url"]);
    const label = body && text(body.label, 80);
    if (
      !body ||
      !label ||
      typeof body.url !== "string" ||
      body.url.length > 2048
    )
      return null;
    const url = normalizeHttpUrl(body.url);
    if (!url) return null;
    links.push({ label, url });
  }
  return links;
}

const uuidList = (value: unknown) => {
  if (!Array.isArray(value) || value.length > 100) return null;
  const ids = value.map(uuid);
  return ids.every(Boolean) ? [...new Set(ids as string[])] : null;
};

export function projectCreateSchema(value: unknown) {
  const body = objectWithKeys(value, [
    "name",
    "description",
    "links",
    "ownerIds",
  ]);
  if (!body) return null;
  const name = text(body.name, 100);
  const description = optionalText(body.description, 1000);
  const links = projectLinks(body.links ?? []);
  const ownerIds = uuidList(body.ownerIds ?? []);
  return name && description && links && ownerIds?.length
    ? { name, description, links, ownerIds }
    : null;
}

export function projectPatchSchema(value: unknown) {
  const body = objectWithKeys(value, [
    "id",
    "name",
    "description",
    "links",
    "archived",
    "ownerIds",
  ]);
  if (!body) return null;
  const id = uuid(body.id);
  const name = body.name === undefined ? undefined : text(body.name, 100);
  const description = optionalText(body.description, 1000);
  const links = body.links === undefined ? undefined : projectLinks(body.links);
  const ownerIds =
    body.ownerIds === undefined ? undefined : uuidList(body.ownerIds);
  if (
    !id ||
    name === null ||
    description === null ||
    links === null ||
    ownerIds === null ||
    (description !== undefined && !description) ||
    (ownerIds !== undefined && ownerIds.length === 0) ||
    (body.archived !== undefined && typeof body.archived !== "boolean")
  )
    return null;
  return {
    id,
    name,
    description,
    links,
    archived: body.archived as boolean | undefined,
    ownerIds,
  };
}

type TaskInput = Pick<
  Task,
  | "title"
  | "description"
  | "status_id"
  | "project_id"
  | "assignee_id"
  | "reported_by"
  | "start_date"
  | "due_date"
  | "due_time"
  | "reminder_at"
  | "priority"
>;
const priorities: Priority[] = ["low", "medium", "high", "urgent"];

export function taskSaveSchema(value: unknown) {
  const body = objectWithKeys(value, ["id", "task", "categoryIds"]);
  if (
    !body ||
    !body.task ||
    typeof body.task !== "object" ||
    Array.isArray(body.task)
  )
    return null;
  const task = body.task as Partial<TaskInput>;
  const title = text(task.title, 500);
  const statusId = uuid(task.status_id);
  const reportedBy = uuid(task.reported_by);
  const categoryIds = uuidList(body.categoryIds);
  const id = body.id === undefined ? null : uuid(body.id);
  if (
    !title ||
    !statusId ||
    !reportedBy ||
    (body.id !== undefined && !id) ||
    !priorities.includes(task.priority as Priority) ||
    !categoryIds?.length
  )
    return null;
  return {
    id,
    task: { ...task, title, status_id: statusId, reported_by: reportedBy },
    categoryIds,
  };
}

export function taskMoveSchema(value: unknown) {
  const body = objectWithKeys(value, ["id", "statusId", "boardPosition"]);
  const id = body && uuid(body.id);
  const statusId = body && uuid(body.statusId);
  return id &&
    statusId &&
    typeof body!.boardPosition === "number" &&
    Number.isFinite(body!.boardPosition)
    ? { id, statusId, boardPosition: body!.boardPosition }
    : null;
}
