type JsonObject = Record<string, unknown>;

const objectWithKeys = (value: unknown, keys: readonly string[]): JsonObject | null => {
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
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
const color = (value: unknown) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : null;

export function statusCreateSchema(value: unknown) {
  const body = objectWithKeys(value, ["name", "color"]);
  if (!body) return null;
  const name = text(body.name, 80);
  const validColor = color(body.color);
  return name && validColor ? { name, color: validColor } : null;
}

export function statusPatchSchema(value: unknown) {
  const body = objectWithKeys(value, ["id", "name", "isCompleted", "orderedIds", "expectedRevision"]);
  if (!body) return null;
  if (body.orderedIds !== undefined) {
    if (!Array.isArray(body.orderedIds) || body.orderedIds.length > 100) return null;
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
  if (!id || name === null || (isCompleted !== undefined && typeof isCompleted !== "boolean")) return null;
  if (name === undefined && isCompleted === undefined) return null;
  return { id, name, isCompleted: isCompleted as boolean | undefined };
}

export function idSchema(value: unknown) {
  const body = objectWithKeys(value, ["id"]);
  const id = body && uuid(body.id);
  return id ? { id } : null;
}

export function workGroupSchema(value: unknown, requireId = false) {
  const body = objectWithKeys(value, ["id", "name", "description", "color"]);
  if (!body) return null;
  const id = requireId ? uuid(body.id) : undefined;
  const name = text(body.name, 80);
  const description = optionalText(body.description, 500);
  const validColor = color(body.color);
  if ((requireId && !id) || !name || description === null || !validColor) return null;
  return { id, name, description: description || null, color: validColor };
}

export function inviteSchema(value: unknown) {
  const body = objectWithKeys(value, ["email", "fullName"]);
  if (!body) return null;
  const email = text(body.email, 254);
  const fullName = optionalText(body.fullName, 100);
  if (!email || fullName === null || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { email: email.toLowerCase(), fullName };
}

export function userDeleteSchema(value: unknown) {
  const body = objectWithKeys(value, ["userId"]);
  const userId = body && uuid(body.userId);
  return userId ? { userId } : null;
}

export function profileSchema(value: unknown) {
  const body = objectWithKeys(value, ["displayName", "avatarPath", "taskDetailsOpenByDefault"]);
  if (!body || typeof body.displayName !== "string" || body.displayName.length > 200) return null;
  if (body.avatarPath !== undefined && (typeof body.avatarPath !== "string" || body.avatarPath.length > 200)) return null;
  if (typeof body.taskDetailsOpenByDefault !== "boolean") return null;
  return {
    displayName: body.displayName,
    avatarPath: body.avatarPath as string | undefined,
    taskDetailsOpenByDefault: body.taskDetailsOpenByDefault,
  };
}
