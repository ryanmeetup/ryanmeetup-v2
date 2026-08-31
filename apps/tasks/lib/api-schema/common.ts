import { objectWithKeys, parseUuid } from "./shared";

export const colorSchema = (value: unknown) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : null;

/**
 * The demo-preview toggle. It carries nothing but the state being asked for;
 * who is allowed to ask is the route's business, not the schema's.
 */
export const demoPreviewSchema = (value: unknown) => {
  const object = objectWithKeys(value, ["enabled"]);
  if (!object || typeof object.enabled !== "boolean") return null;
  return { enabled: object.enabled };
};

export function idSchema(value: unknown) {
  const body = objectWithKeys(value, ["id"]);
  const id = body && parseUuid(body.id);
  return id ? { id } : null;
}

export function scheduledEmailActionSchema(value: unknown) {
  const body = objectWithKeys(value, ["action"]);
  return body?.action === "delay" || body?.action === "cancel"
    ? { action: body.action }
    : null;
}
