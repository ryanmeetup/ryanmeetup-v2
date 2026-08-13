export type JsonObject = Record<string, unknown>;

export const objectWithKeys = (
  value: unknown,
  keys: readonly string[],
): JsonObject | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const object = value as JsonObject;
  return Object.keys(object).every((key) => keys.includes(key)) ? object : null;
};

export const text = (value: unknown, max: number, required = true) => {
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : null;
};

export const optionalText = (value: unknown, max: number) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length <= max ? normalized : null;
};

export const uuid = (value: unknown) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;

export const uuidList = (value: unknown) => {
  if (!Array.isArray(value) || value.length > 100) return null;
  const ids = value.map(uuid);
  return ids.every(Boolean) ? [...new Set(ids as string[])] : null;
};
