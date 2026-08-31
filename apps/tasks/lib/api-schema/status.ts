import { colorSchema } from "./common";
import {
  objectWithKeys,
  optionalTrimmedText,
  parseUuid,
  requiredTrimmedText,
} from "./shared";

export function statusCreateSchema(value: unknown) {
  const body = objectWithKeys(value, ["name", "description", "color"]);
  if (!body) return null;
  const name = requiredTrimmedText(body.name, 80);
  const description = optionalTrimmedText(body.description, 240);
  const validColor = colorSchema(body.color);
  return name && description !== null && validColor
    ? { name, description: description || null, color: validColor }
    : null;
}

export function statusPatchSchema(value: unknown) {
  const body = objectWithKeys(value, [
    "id",
    "name",
    "description",
    "color",
    "isCompleted",
    "orderedIds",
    "expectedRevision",
  ]);
  if (!body) return null;
  if (body.orderedIds !== undefined) {
    if (!Array.isArray(body.orderedIds) || body.orderedIds.length > 100)
      return null;
    const orderedIds = body.orderedIds.map(parseUuid);
    const expectedRevision = body.expectedRevision;
    return orderedIds.every(Boolean) &&
      typeof expectedRevision === "number" &&
      Number.isSafeInteger(expectedRevision) &&
      expectedRevision >= 0
      ? { orderedIds: orderedIds as string[], expectedRevision }
      : null;
  }
  const id = parseUuid(body.id);
  const name =
    body.name === undefined ? undefined : requiredTrimmedText(body.name, 80);
  // A null description is how the client clears one it had already written.
  const description = optionalTrimmedText(
    body.description === null ? "" : body.description,
    240,
  );
  const patchColor =
    body.color === undefined ? undefined : colorSchema(body.color);
  const isCompleted = body.isCompleted;
  if (
    !id ||
    name === null ||
    description === null ||
    patchColor === null ||
    (isCompleted !== undefined && typeof isCompleted !== "boolean")
  )
    return null;
  if (
    name === undefined &&
    description === undefined &&
    patchColor === undefined &&
    isCompleted === undefined
  )
    return null;
  return {
    id,
    name,
    description: description === undefined ? undefined : description || null,
    color: patchColor,
    isCompleted: isCompleted as boolean | undefined,
  };
}
