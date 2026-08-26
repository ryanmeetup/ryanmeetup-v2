import type { ProjectLink } from "@/lib/resources/resource-types";
import {
  footerVariants,
  isFeedbackHref,
  socialPlatforms,
} from "@/lib/instance";
import { normalizeHttpUrl } from "@ryanmeetup/utils";
export { taskMoveSchema, taskSaveSchema } from "./task";
export { digestSettingsSchema } from "./digest";

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

/**
 * The demo-preview toggle. It carries nothing but the state being asked for;
 * who is allowed to ask is the route's business, not the schema's.
 */
export const demoPreviewSchema = (value: unknown) => {
  const object = objectWithKeys(value, ["enabled"]);
  if (!object || typeof object.enabled !== "boolean") return null;
  return { enabled: object.enabled };
};

export function statusCreateSchema(value: unknown) {
  const body = objectWithKeys(value, ["name", "description", "color"]);
  if (!body) return null;
  const name = text(body.name, 80);
  const description = optionalText(body.description, 240);
  const validColor = color(body.color);
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
  // A null description is how the client clears one it had already written.
  const description = optionalText(
    body.description === null ? "" : body.description,
    240,
  );
  const patchColor = body.color === undefined ? undefined : color(body.color);
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
    "tags",
    "ownerIds",
    "archived",
    "accessMode",
    "accessGroupIds",
  ]);
  if (!body) return null;
  const id = requireId ? uuid(body.id) : undefined;
  const name = text(body.name, 80);
  const description = optionalText(body.description, 500);
  const validColor = color(body.color);
  const links = projectLinks(body.links ?? []);
  const rawTags = body.tags ?? [];
  const tags = Array.isArray(rawTags)
    ? [...new Set(rawTags.map((tag) => text(tag, 40)).filter(Boolean))]
    : null;
  const archived = body.archived;
  const ownerIds =
    body.ownerIds === undefined ? undefined : uuidList(body.ownerIds);
  const accessMode =
    body.accessMode === undefined
      ? undefined
      : body.accessMode === "open" || body.accessMode === "restricted"
        ? body.accessMode
        : null;
  const accessGroupIds =
    body.accessGroupIds === undefined
      ? undefined
      : uuidList(body.accessGroupIds);
  if (
    (requireId && !id) ||
    !name ||
    description === null ||
    (!requireId && !description) ||
    !validColor ||
    !links ||
    !tags ||
    tags.length > 20 ||
    ownerIds === null ||
    accessMode === null ||
    accessGroupIds === null ||
    (!requireId && (!ownerIds || ownerIds.length === 0)) ||
    (ownerIds !== undefined && ownerIds.length === 0) ||
    (archived !== undefined && typeof archived !== "boolean")
  )
    return null;
  return {
    id,
    name,
    description: description || null,
    color: validColor,
    links,
    tags,
    ownerIds,
    archived: archived as boolean | undefined,
    accessMode: accessMode as "open" | "restricted" | undefined,
    accessGroupIds,
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

export function scheduledEmailActionSchema(value: unknown) {
  const body = objectWithKeys(value, ["action"]);
  return body?.action === "delay" || body?.action === "cancel"
    ? { action: body.action }
    : null;
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

/** Titled link columns for the branded footer. */
function footerSections(value: unknown) {
  if (!Array.isArray(value) || value.length > 3) return null;
  const sections: { title: string; links: ProjectLink[] }[] = [];
  for (const item of value) {
    const body = objectWithKeys(item, ["title", "links"]);
    const title = body && text(body.title, 80);
    const links = body && projectLinks(body.links ?? []);
    if (!title || !links) return null;
    sections.push({ title, links });
  }
  return sections;
}

/** Social icons for the footer, keyed by a platform the icon map knows. */
function footerSocials(value: unknown) {
  if (!Array.isArray(value) || value.length > 8) return null;
  const socials: { platform: string; url: string }[] = [];
  for (const item of value) {
    const body = objectWithKeys(item, ["platform", "url"]);
    if (
      !body ||
      typeof body.platform !== "string" ||
      !(socialPlatforms as readonly string[]).includes(body.platform)
    )
      return null;
    const url = httpsUrl(body.url);
    if (!url) return null;
    // One entry per network, so the footer cannot render the same icon twice.
    if (socials.some((social) => social.platform === body.platform))
      return null;
    socials.push({ platform: body.platform, url });
  }
  return socials;
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

/**
 * Runtime branding overrides. Every field is optional; `null` clears a value
 * back to the build-time default. Keys absent from the body are left alone.
 */
/**
 * Instance URLs must be https. `normalizeHttpUrl` also accepts http, but every
 * URL column in `instance_settings` carries a `~ '^https://'` check, so an http
 * value would pass validation only to be rejected by the database.
 */
export function httpsUrl(raw: unknown) {
  if (typeof raw !== "string") return null;
  const url = normalizeHttpUrl(raw);
  return url && url.startsWith("https://") ? url : null;
}

export function instanceSettingsSchema(value: unknown) {
  // Each validator returns the cleaned value, or null when the input is
  // rejected. The footer sections and socials are arrays, so an empty one —
  // the owner dropping those columns or icons — has to survive the check
  // below, which is why results are compared against null rather than tested
  // for truthiness.
  const fields = {
    name: (raw: unknown) => text(raw, 80),
    productName: (raw: unknown) => text(raw, 120),
    tagline: (raw: unknown) => text(raw, 80),
    description: (raw: unknown) => text(raw, 400),
    monogram: (raw: unknown) =>
      typeof raw === "string" && [...raw.trim()].length === 1
        ? raw.trim()
        : null,
    accentColor: color,
    logoPath: (raw: unknown) =>
      typeof raw === "string" &&
      (/^\/[^/]/.test(raw) || /^https:\/\/[^\s]+$/.test(raw))
        ? raw
        : null,
    betaBannerEnabled: (raw: unknown) =>
      typeof raw === "boolean" ? raw : null,
    feedbackInWorkspace: (raw: unknown) =>
      typeof raw === "boolean" ? raw : null,
    feedbackUrl: (raw: unknown) =>
      typeof raw === "string" &&
      isFeedbackHref(raw.trim()) &&
      raw.length <= 2048
        ? raw.trim()
        : null,
    footerVariant: (raw: unknown) =>
      typeof raw === "string" &&
      (footerVariants as readonly string[]).includes(raw)
        ? raw
        : null,
    footerSubtitle: (raw: unknown) => text(raw, 80),
    footerSections: footerSections,
    footerSocials: footerSocials,
    creditPrefix: (raw: unknown) => text(raw, 80),
    creditLabel: (raw: unknown) => text(raw, 80),
    creditUrl: httpsUrl,
    creditSuffix: (raw: unknown) => text(raw, 80),
    ogAlt: (raw: unknown) => text(raw, 200),
    ogHeadline: (raw: unknown) => text(raw, 60),
    ogTagline: (raw: unknown) => text(raw, 120),
    ogMotto: (raw: unknown) => text(raw, 120),
  } as const;

  // Any setting may be sent as null. For `logoPath` and the socials that means
  // "render nothing"; for the rest it means "drop the stored override and go
  // back to the build-time default". `resolveInstanceSettings` draws that
  // distinction from `nullableInstanceSettings`, so the API does not need to.
  const body = objectWithKeys(value, Object.keys(fields));
  if (!body) return null;

  const parsed: Record<string, unknown> = {};
  for (const [key, validate] of Object.entries(fields)) {
    const raw = body[key];
    if (raw === undefined) continue;
    if (raw === null) {
      parsed[key] = null;
      continue;
    }
    const result = (validate as (input: unknown) => unknown)(raw);
    if (result === null || result === undefined || result === "") return null;
    parsed[key] = result;
  }
  return Object.keys(parsed).length ? parsed : null;
}
