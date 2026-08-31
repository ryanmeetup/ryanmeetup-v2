import { instanceDefaults, type InstanceSettings } from "@/lib/instance";

/** Every setting edited as free text. Footer presentation is not editable. */
export type InstanceTextKey = Exclude<
  keyof InstanceSettings,
  | "footerSections"
  | "footerSocials"
  | "footerSubtitle"
  | "creditPrefix"
  | "creditLabel"
  | "creditUrl"
  | "creditSuffix"
  | "bannerEnabled"
>;

/** Draft values keyed by setting. `""` means "inherit the default". */
export type InstanceDraft = Record<InstanceTextKey, string>;

export type InstanceFieldSpec = {
  key: InstanceTextKey;
  label: string;
  /** A generic example, never this instance's real value. */
  placeholder: string;
  hint?: string;
  multiline?: boolean;
  maxLength: number;
};

export const identityFields: InstanceFieldSpec[] = [
  {
    key: "name",
    label: "Instance name",
    placeholder: "e.g. Acme Collective",
    maxLength: 80,
    hint: "The wordmark in the sidebar, header, sign-in card, and footer, and the name in browser tab titles, email subjects, and link previews.",
  },
  {
    key: "description",
    label: "Description",
    placeholder: "e.g. Where the Acme team plans projects and tracks work.",
    maxLength: 400,
    multiline: true,
    hint: "Shown when someone pastes a link to this workspace into Slack or Messages.",
  },
];

/**
 * The banner's settings. Unlike the branding fields above, these are edited as
 * explicit values rather than as overrides of a compiled default: "no link"
 * and "no message" are real choices an instance makes, and a blank input
 * cannot mean both that and "inherit". `BannerSettingsModal` seeds its inputs
 * from the resolved settings and writes only what actually changes, so a
 * dialog that is opened and closed leaves the instance inheriting.
 */
export const bannerKeys = [
  "bannerEnabled",
  "bannerMessage",
  "bannerLinkUrl",
  "bannerLinkLabel",
] as const satisfies readonly (keyof InstanceSettings)[];

/**
 * The two the owner writes. Both are ordinary override fields -- blank inherits
 * -- so they use the same field idiom as Identity: an empty message falls back
 * to this deployment's notice, and an empty label lets the link phrase itself
 * from its address.
 */
export const bannerFields: InstanceFieldSpec[] = [
  {
    key: "bannerMessage",
    label: "Message",
    placeholder: "e.g. Scheduled maintenance this Saturday morning.",
    maxLength: 200,
    multiline: true,
    hint: "One sentence above the workspace. Members can dismiss it, and a rewrite brings it back for everyone.",
  },
  {
    key: "bannerLinkLabel",
    label: "Link label",
    placeholder: "e.g. Read the details",
    maxLength: 60,
    hint: "What the link reads as. Blank uses the email address, or “Learn more” for a page.",
  },
];

/** The link is an explicit value rather than an override: blank means none. */
export const bannerLinkKey: InstanceTextKey = "bannerLinkUrl";

/**
 * The card's words are the instance name and description, edited under
 * Identity. What is left here is the badge and how the card is described to
 * anyone who cannot see it.
 */
export const previewFields: InstanceFieldSpec[] = [
  {
    key: "monogram",
    label: "Monogram",
    placeholder: "e.g. A",
    maxLength: 2,
    hint: "One character for the badge.",
  },
  {
    key: "ogAlt",
    label: "Alt text",
    placeholder: "e.g. Acme — private team workspace",
    maxLength: 200,
    multiline: true,
    hint: "Describes the card for screen readers and clients that cannot load the image.",
  },
];

export const accentField: InstanceFieldSpec = {
  key: "accentColor",
  label: "Accent color",
  placeholder: `e.g. ${instanceDefaults.accentColor}`,
  maxLength: 7,
};

/** The wordmark is edited through its own upload control, not a text input. */
export const logoKey: InstanceTextKey = "logoPath";

export const hexPattern = /^#[0-9a-fA-F]{6}$/;

/** The stored override for a key, or null when the instance inherits it. */
export function storedText(
  overrides: Partial<Record<keyof InstanceSettings, unknown>> | null,
  key: keyof InstanceSettings,
) {
  const value = overrides?.[key];
  return typeof value === "string" ? value : null;
}

/** A draft holding only stored overrides; `""` elsewhere means inherit. */
export function draftForKeys(
  keys: InstanceTextKey[],
  overrides: Partial<Record<keyof InstanceSettings, unknown>> | null,
) {
  const draft = {} as InstanceDraft;
  for (const key of keys) draft[key] = storedText(overrides, key) ?? "";
  return draft;
}

/**
 * Only what changed against the stored row. An emptied field becomes an
 * explicit null so the override is dropped and the value goes back to the
 * build-time default named under the input.
 */
export function diffTextKeys(
  keys: InstanceTextKey[],
  draft: InstanceDraft,
  stored: Partial<Record<keyof InstanceSettings, unknown>> | null,
) {
  const body: Record<string, string | null> = {};
  for (const key of keys) {
    const next = draft[key]?.trim() || null;
    if (next !== storedText(stored, key)) body[key] = next;
  }
  return body;
}

/** Per-field messages for anything the API would reject. */
export function validateTextFields(
  fields: InstanceFieldSpec[],
  draft: InstanceDraft,
) {
  const found: Partial<Record<InstanceTextKey, string>> = {};
  for (const spec of fields) {
    const value = draft[spec.key]?.trim();
    if (!value) continue;
    if (value.length > spec.maxLength)
      found[spec.key] = `Keep this to ${spec.maxLength} characters or fewer.`;
    else if (spec.key === "monogram" && [...value].length !== 1)
      found[spec.key] = "Use exactly one character.";
    else if (spec.key === "accentColor" && !hexPattern.test(value))
      found[spec.key] = "Use a six-digit hex color such as #ee1a25.";
  }
  return found;
}

/** Draft text values as overrides, for resolving a live preview. */
export function overridesFromDraft(draft: Partial<InstanceDraft>) {
  const overrides: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(draft)) {
    const trimmed = value?.trim();
    if (trimmed) overrides[key] = trimmed;
  }
  if (overrides.accentColor && !hexPattern.test(String(overrides.accentColor)))
    delete overrides.accentColor;
  return overrides;
}
