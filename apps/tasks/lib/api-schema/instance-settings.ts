import {
  footerVariants,
  isFeedbackHref,
  socialPlatforms,
} from "@/lib/instance";
import type { ProjectLink } from "@/lib/resources/resource-types";
import { normalizeHttpUrl } from "@ryanmeetup/utils";
import { colorSchema } from "./common";
import { projectLinks } from "./resource-links";
import { objectWithKeys, requiredTrimmedText } from "./shared";

/** Titled link columns for the branded footer. */
function footerSections(value: unknown) {
  if (!Array.isArray(value) || value.length > 3) return null;
  const sections: { title: string; links: ProjectLink[] }[] = [];
  for (const item of value) {
    const body = objectWithKeys(item, ["title", "links"]);
    const title = body && requiredTrimmedText(body.title, 80);
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
    if (socials.some((social) => social.platform === body.platform))
      return null;
    socials.push({ platform: body.platform, url });
  }
  return socials;
}

/**
 * Instance URLs must be https. `normalizeHttpUrl` also accepts http, but every
 * URL column in `instance_settings` carries a `~ '^https://'` check.
 */
export function httpsUrl(raw: unknown) {
  if (typeof raw !== "string") return null;
  const url = normalizeHttpUrl(raw);
  return url && url.startsWith("https://") ? url : null;
}

export function instanceSettingsSchema(value: unknown) {
  const fields = {
    name: (raw: unknown) => requiredTrimmedText(raw, 80),
    productName: (raw: unknown) => requiredTrimmedText(raw, 120),
    tagline: (raw: unknown) => requiredTrimmedText(raw, 80),
    description: (raw: unknown) => requiredTrimmedText(raw, 400),
    monogram: (raw: unknown) =>
      typeof raw === "string" && [...raw.trim()].length === 1
        ? raw.trim()
        : null,
    accentColor: colorSchema,
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
    footerSubtitle: (raw: unknown) => requiredTrimmedText(raw, 80),
    footerSections,
    footerSocials,
    creditPrefix: (raw: unknown) => requiredTrimmedText(raw, 80),
    creditLabel: (raw: unknown) => requiredTrimmedText(raw, 80),
    creditUrl: httpsUrl,
    creditSuffix: (raw: unknown) => requiredTrimmedText(raw, 80),
    ogAlt: (raw: unknown) => requiredTrimmedText(raw, 200),
    ogHeadline: (raw: unknown) => requiredTrimmedText(raw, 60),
    ogTagline: (raw: unknown) => requiredTrimmedText(raw, 120),
    ogMotto: (raw: unknown) => requiredTrimmedText(raw, 120),
  } as const;

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
