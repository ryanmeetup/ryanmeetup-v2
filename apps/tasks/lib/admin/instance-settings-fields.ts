import {
  instanceDefaults,
  isFeedbackHref,
  type InstanceSettings,
} from "@/lib/instance";
import { normalizeHttpUrl } from "@ryanmeetup/utils";

/** Every setting edited as free text. The structured footer values — the
 *  variant, its sections, and its socials — get their own controls. */
export type InstanceTextKey = Exclude<
  keyof InstanceSettings,
  | "footerSections"
  | "footerSocials"
  | "footerVariant"
  | "betaBannerEnabled"
  | "feedbackInWorkspace"
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
    hint: "The wordmark in the sidebar, header, sign-in card, and footer.",
  },
  {
    key: "productName",
    label: "Product name",
    placeholder: "e.g. Acme Tasks",
    maxLength: 120,
    hint: "Browser tab titles, email subjects, and link previews.",
  },
  {
    key: "tagline",
    label: "Tagline",
    placeholder: "e.g. Task tracker",
    maxLength: 80,
    hint: "The small label under the sidebar wordmark.",
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
 * The beta banner's settings. Unlike the branding fields above, these are
 * edited as explicit values rather than as overrides of a compiled default:
 * "no feedback link" is a real choice an instance makes, and a blank input
 * cannot mean both that and "inherit". `BannerSettingsModal` seeds its inputs
 * from the resolved settings and writes only what actually changes.
 */
export const bannerKeys = [
  "betaBannerEnabled",
  "feedbackInWorkspace",
  "feedbackUrl",
] as const satisfies readonly (keyof InstanceSettings)[];

export const footerTextFields: InstanceFieldSpec[] = [
  {
    key: "footerSubtitle",
    label: "Footer subtitle",
    placeholder: "e.g. Est. 2019",
    maxLength: 80,
    hint: "The second line of the oversized footer wordmark.",
  },
];

export const creditFields: InstanceFieldSpec[] = [
  {
    key: "creditLabel",
    label: "Credit name",
    placeholder: "e.g. Jordan Rivera",
    maxLength: 80,
    hint: "The linked words.",
  },
  {
    key: "creditUrl",
    label: "Credit link",
    placeholder: "e.g. example.com",
    maxLength: 2048,
    hint: "Where the name points.",
  },
];

/** The sentence around the link. Rarely touched, so it stays folded away. */
export const creditWordingFields: InstanceFieldSpec[] = [
  {
    key: "creditPrefix",
    label: "Before the link",
    placeholder: "e.g. Built by ",
    maxLength: 80,
    hint: "Include the trailing space.",
  },
  {
    key: "creditSuffix",
    label: "After the link",
    placeholder: "e.g. . All rights reserved.",
    maxLength: 80,
  },
];

export const previewFields: InstanceFieldSpec[] = [
  {
    key: "ogHeadline",
    label: "Headline",
    placeholder: "e.g. Tasks",
    maxLength: 60,
    hint: "The large words on the card.",
  },
  {
    key: "ogTagline",
    label: "Card tagline",
    placeholder: "e.g. Private workspace for the core team",
    maxLength: 120,
    hint: "The line under the headline.",
  },
  {
    key: "ogMotto",
    label: "Card footer",
    placeholder: "e.g. Plan it. Assign it. Get it done.",
    maxLength: 120,
    hint: "The line beside the status dot.",
  },
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
    placeholder: "e.g. Acme Tasks — private team workspace",
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

const urlKeys = new Set<InstanceTextKey>(["creditUrl"]);

export const hexPattern = /^#[0-9a-fA-F]{6}$/;

/** An https URL, or null when the value cannot be one. */
export function httpsOrNull(value: string) {
  const url = normalizeHttpUrl(value);
  return url && url.startsWith("https://") ? url : null;
}

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
    else if (urlKeys.has(spec.key) && !httpsOrNull(value))
      found[spec.key] = "Enter a full https:// address.";
    else if (spec.key === "feedbackUrl" && !isFeedbackHref(value))
      found[spec.key] =
        "Enter a full https:// address or a mailto: email link.";
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
