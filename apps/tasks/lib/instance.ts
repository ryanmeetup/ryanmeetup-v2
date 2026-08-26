/**
 * Per-instance identity: the values that change when this codebase is deployed
 * as a workspace for a different organization or person.
 *
 * There are two tiers.
 *
 * `instanceBuild` is fixed at build time because its values compose
 * identifiers. The task key prefix appears in URLs (`/task/RMT-142`) and is
 * consumed by pure synchronous modules, so it cannot vary per request and
 * editing it at runtime would break every existing link.
 *
 * Everything in `InstanceSettings` is presentational and may be overridden at
 * runtime from the `instance_settings` table via /admin/settings. The values
 * here are the defaults used when no row or no column value exists.
 *
 * Every value falls back to the Ryan Meetup original, so a deployment that sets
 * none of these behaves exactly as it did before this module existed. A second
 * instance overrides only what actually differs.
 *
 * Each variable is read as a literal `process.env.NEXT_PUBLIC_*` member
 * expression because Next.js inlines client-visible variables at build time by
 * static replacement. A dynamic lookup would resolve to `undefined` in the
 * browser, so do not refactor these reads behind a computed key.
 */

function text(raw: string | undefined, fallback: string) {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : fallback;
}

function optionalText(raw: string | undefined) {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

function keyPrefix(raw: string | undefined, fallback: string) {
  const candidate = text(raw, fallback).toUpperCase();
  // The prefix is interpolated into task-key regular expressions, so it must be
  // a short, literal, alphanumeric token rather than arbitrary user text.
  if (!/^[A-Z][A-Z0-9]{0,9}$/.test(candidate)) {
    throw new Error(
      "NEXT_PUBLIC_TASK_KEY_PREFIX must be 1-10 alphanumeric characters starting with a letter.",
    );
  }
  return candidate;
}

function hexColor(raw: string | undefined, fallback: string) {
  const candidate = text(raw, fallback);
  // Interpolated into inline email styles, where a malformed value would break
  // the surrounding declaration.
  if (!/^#[0-9a-fA-F]{6}$/.test(candidate)) {
    throw new Error(
      "NEXT_PUBLIC_INSTANCE_ACCENT must be a six-digit hex color such as #ee1a25.",
    );
  }
  return candidate;
}

/** One entry in a footer link section. */
export type InstanceFooterLink = { label: string; url: string };

/** A titled column of links in the branded footer. */
export type InstanceFooterSection = {
  title: string;
  links: InstanceFooterLink[];
};

/**
 * Social networks the footer knows how to render an icon for. Storing the
 * platform rather than a column per network means adding one is a change here
 * and in the icon map, not a migration.
 */
export const socialPlatforms = [
  "instagram",
  "youtube",
  "github",
  "linkedin",
  "x",
  "facebook",
  "tiktok",
  "website",
] as const;
export type InstanceSocialPlatform = (typeof socialPlatforms)[number];
export type InstanceFooterSocial = {
  platform: InstanceSocialPlatform;
  url: string;
};

/**
 * How much footer an instance wants.
 *
 * `branded` is a generalized marketing footer — an oversized wordmark with a
 * subtitle, titled link columns, social icons, and a credit sentence. Every
 * part of it is data, so it is a shape any deployment can fill rather than a
 * reproduction of one organization's footer; the Ryan Meetup values below are
 * simply this build's defaults. `minimal` is a single credit row and `none`
 * removes the footer entirely.
 */
export const footerVariants = ["branded", "minimal", "none"] as const;
export type InstanceFooterVariant = (typeof footerVariants)[number];

function footerVariant(raw: string | undefined): InstanceFooterVariant {
  const candidate = text(raw, "branded");
  return (footerVariants as readonly string[]).includes(candidate)
    ? (candidate as InstanceFooterVariant)
    : "branded";
}

function assetPath(raw: string | undefined) {
  const candidate = optionalText(raw);
  if (!candidate) return null;
  // Same-origin only: the content security policy serves images from `self`,
  // and a protocol-relative path would escape it.
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    throw new Error(
      "NEXT_PUBLIC_INSTANCE_LOGO_PATH must be a root-relative path such as /logo.svg.",
    );
  }
  return candidate;
}

export const isDemoBuild =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const name = text(process.env.NEXT_PUBLIC_INSTANCE_NAME, "Ryan Meetup");
const productName = text(
  process.env.NEXT_PUBLIC_INSTANCE_PRODUCT_NAME,
  `${name} Tasks`,
);
const taskKeyPrefix = keyPrefix(
  process.env.NEXT_PUBLIC_TASK_KEY_PREFIX,
  isDemoBuild ? "TASK" : "RMT",
);

/**
 * Build-time tier. These compose identifiers, so they are compiled in and shown
 * read-only on the settings page alongside the variable that changes them.
 */
export const instanceBuild = {
  /** Prefix for readable public task keys, e.g. RMT-142 or demo TASK-142. */
  taskKeyPrefix,
  /** Prefix for changelog versions, e.g. "RMT v5" or demo "TASK v5". */
  changelogVersionPrefix: text(
    process.env.NEXT_PUBLIC_CHANGELOG_VERSION_PREFIX,
    taskKeyPrefix,
  ),
} as const;

/** Runtime tier. Presentational only; overridable from `instance_settings`. */
export type InstanceSettings = {
  /** Organization or person the workspace belongs to. Used as the wordmark. */
  name: string;
  /** Full product name used in page titles, metadata, and email subjects. */
  productName: string;
  /** Short label under the sidebar wordmark. */
  tagline: string;
  /** Metadata description for search, link previews, and the OG image. */
  description: string;
  /** Single letter shown in the OG image badge. */
  monogram: string;
  /** Brand accent, used where a token is unavailable such as email HTML. */
  accentColor: string;
  /** Root-relative path or public URL of an image wordmark. Null uses `name`. */
  logoPath: string | null;
  /** How much footer to render. See `footerVariants`. */
  footerVariant: InstanceFooterVariant;
  /** Second line of the oversized wordmark. `branded` variant only. */
  footerSubtitle: string;
  /** Titled link columns. An empty array drops them. `branded` only. */
  footerSections: InstanceFooterSection[];
  /** Social icons beside the credit. An empty array drops them. */
  footerSocials: InstanceFooterSocial[];
  /** Sentence around the credit link, e.g. "Built by " + label + ".". */
  creditPrefix: string;
  creditLabel: string;
  creditUrl: string;
  creditSuffix: string;
  ogAlt: string;
  ogHeadline: string;
  ogTagline: string;
  ogMotto: string;
};

/** Compiled-in defaults, used wherever `instance_settings` has no value. */
export const instanceDefaults: InstanceSettings = {
  name,
  productName,
  tagline: text(process.env.NEXT_PUBLIC_INSTANCE_TAGLINE, "Task tracker"),
  description: text(
    process.env.NEXT_PUBLIC_INSTANCE_DESCRIPTION,
    `The private workspace for the ${name} core team to plan projects and keep work moving.`,
  ),
  monogram: text(
    process.env.NEXT_PUBLIC_INSTANCE_MONOGRAM,
    name.charAt(0),
  ).charAt(0),
  accentColor: hexColor(process.env.NEXT_PUBLIC_INSTANCE_ACCENT, "#ee1a25"),
  logoPath: assetPath(process.env.NEXT_PUBLIC_INSTANCE_LOGO_PATH),
  footerVariant: footerVariant(process.env.NEXT_PUBLIC_INSTANCE_FOOTER_VARIANT),
  footerSubtitle: text(
    process.env.NEXT_PUBLIC_INSTANCE_FOOTER_SUBTITLE,
    "NO BRYANS ALLOWED",
  ),
  // This build's content for the branded shape: the stack credit Ryan Meetup
  // shows across its apps. Another instance replaces or empties these from
  // /admin/settings; neither is special-cased anywhere in the renderer.
  footerSections: [
    {
      title: "Built with",
      links: [
        { label: "Vercel", url: "https://vercel.com" },
        { label: "Next.js", url: "https://nextjs.org/" },
        { label: "React", url: "https://react.dev/" },
        { label: "Tailwind CSS", url: "https://tailwindcss.com/" },
        { label: "Supabase", url: "https://supabase.com/" },
        { label: "Headless UI", url: "https://headlessui.com/" },
      ],
    },
  ],
  footerSocials: [
    { platform: "instagram", url: "https://www.instagram.com/ryanmeetup/" },
    { platform: "youtube", url: "https://www.youtube.com/@ryanmeetup" },
  ],
  creditPrefix: text(
    process.env.NEXT_PUBLIC_INSTANCE_CREDIT_PREFIX,
    "Website designed and developed by ",
  ),
  creditLabel: text(process.env.NEXT_PUBLIC_INSTANCE_CREDIT_LABEL, "Ryan Le"),
  creditUrl: text(
    process.env.NEXT_PUBLIC_INSTANCE_CREDIT_URL,
    "https://ryanle.dev/",
  ),
  creditSuffix: text(
    process.env.NEXT_PUBLIC_INSTANCE_CREDIT_SUFFIX,
    ". All Rights Reserved.",
  ),
  ogAlt: text(
    process.env.NEXT_PUBLIC_INSTANCE_OG_ALT,
    `${productName} — private team workspace`,
  ),
  ogHeadline: text(process.env.NEXT_PUBLIC_INSTANCE_OG_HEADLINE, "Tasks"),
  ogTagline: text(
    process.env.NEXT_PUBLIC_INSTANCE_OG_TAGLINE,
    "Private workspace for the core team",
  ),
  ogMotto: text(
    process.env.NEXT_PUBLIC_INSTANCE_OG_MOTTO,
    "Plan it. Assign it. Get it done.",
  ),
};

/**
 * Neutral presentation for the zero-configuration local demo. Demo mode is
 * often the first view of the product, so it should demonstrate a reusable
 * team workspace rather than inherit one deployment's identity.
 */
export const demoInstanceSettings: InstanceSettings = {
  name: "Workspace",
  productName: "Team Tasks",
  tagline: "Team task tracker",
  description:
    "A shared workspace for planning projects, assigning tasks, and keeping work moving.",
  monogram: "W",
  accentColor: "#2563eb",
  logoPath: null,
  footerVariant: "minimal",
  footerSubtitle: "",
  footerSections: [],
  footerSocials: [],
  creditPrefix: "",
  creditLabel: "Team Tasks",
  creditUrl: "/",
  creditSuffix: "",
  ogAlt: "Team Tasks — shared team workspace",
  ogHeadline: "Tasks",
  ogTagline: "Shared workspace for your team",
  ogMotto: "Plan it. Assign it. Get it done.",
};

/** Which `InstanceSettings` keys may be cleared back to their default. */
export const nullableInstanceSettings = [
  "logoPath",
] as const satisfies readonly (keyof InstanceSettings)[];

type NullableKey = (typeof nullableInstanceSettings)[number];

/** A stored override row: absent keys and nulls both mean "use the default". */
export type InstanceSettingsOverrides = Partial<{
  [Key in keyof InstanceSettings]: InstanceSettings[Key] | null;
}>;

/**
 * Layer stored overrides on the compiled defaults. A null or absent value falls
 * back, except for keys that are legitimately empty, where an explicit null is
 * the owner deliberately clearing the value.
 */
export function resolveInstanceSettings(
  overrides: InstanceSettingsOverrides | null | undefined,
  defaults: InstanceSettings = instanceDefaults,
): InstanceSettings {
  if (!overrides) return defaults;
  const resolved = { ...defaults };
  for (const key of Object.keys(
    defaults,
  ) as (keyof InstanceSettings)[]) {
    const override = overrides[key];
    if (override === undefined) continue;
    if (override === null) {
      if (nullableInstanceSettings.includes(key as NullableKey)) {
        (resolved[key] as string | null) = null;
      }
      continue;
    }
    // Not every setting is a string — the footer sections and socials are
    // arrays and `footerVariant` is a union — so the assignment is widened
    // rather than asserted per key. The value was validated on the way in.
    (resolved as Record<string, unknown>)[key] = override;
  }
  return resolved;
}

/** Title for a route, matching the layout's `%s | <product>` template. */
export function instancePageTitle(settings: InstanceSettings, title: string) {
  return `${title} | ${settings.productName}`;
}
