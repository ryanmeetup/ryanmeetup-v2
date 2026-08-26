/**
 * Per-instance identity: the values that change when this codebase is deployed
 * as a workspace for a different organization or person.
 *
 * There are two tiers.
 *
 * `instanceBuild` is fixed at build time because its values compose
 * identifiers. The task key prefix appears in URLs (`/task/TASK-142`) and is
 * consumed by pure synchronous modules, so it cannot vary per request and
 * editing it at runtime would break every existing link.
 *
 * Everything in `InstanceSettings` is presentational and may be overridden at
 * runtime from the `instance_settings` table via /admin/settings. The values
 * here are the defaults used when no row or no column value exists.
 *
 * The compiled defaults are deliberately unbranded: a build that configures
 * nothing presents as an unnamed workspace rather than wearing another
 * deployment's identity. Ryan Meetup is an instance like any other and names
 * itself through the variables below or /admin/settings.
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

function flag(raw: string | undefined, fallback: boolean) {
  const trimmed = raw?.trim().toLowerCase();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return fallback;
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
 * `minimal` is the default: a small wordmark, the section links inline,
 * socials, and the credit. It is the honest baseline for a deployment that has
 * said nothing about itself, because an unconfigured instance has no wordmark
 * worth setting six lines tall.
 *
 * `branded` is the same content as a marketing footer — an oversized wordmark
 * with a subtitle, titled link columns, social icons, and a credit sentence.
 * Every part of it is data, so it is a shape any deployment can fill rather
 * than a reproduction of one organization's footer, but it only pays off once
 * an instance has filled it in, so it is opt-in. `none` removes the footer
 * entirely.
 */
export const footerVariants = ["branded", "minimal", "none"] as const;
export type InstanceFooterVariant = (typeof footerVariants)[number];

function footerVariant(raw: string | undefined): InstanceFooterVariant {
  const candidate = text(raw, "minimal");
  return (footerVariants as readonly string[]).includes(candidate)
    ? (candidate as InstanceFooterVariant)
    : "minimal";
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

/** Shared with the settings form and the API so all three agree. */
export function isFeedbackHref(value: string) {
  return (
    /^https:\/\/[^\s]+$/.test(value) || /^mailto:[^\s@]+@[^\s@]+$/.test(value)
  );
}

/**
 * Where the beta banner sends someone with a bug or an idea. An instance may
 * point anywhere -- a tracker, a form, a shared inbox -- so the only thing the
 * codebase can assert is the shape: an https page or a mailto address.
 * Anything else is a misconfiguration worth failing loudly on, since the value
 * is rendered as a link users are invited to click.
 */
function feedbackHref(raw: string | undefined, fallback: string | null) {
  const candidate = optionalText(raw) ?? fallback;
  if (!candidate) return null;
  if (!isFeedbackHref(candidate)) {
    throw new Error(
      "NEXT_PUBLIC_INSTANCE_FEEDBACK_URL must be an https:// address or a mailto: link.",
    );
  }
  return candidate;
}

export const isDemoBuild =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * A configured name also seeds the description sentence below. Left unset the
 * build has no organization to name, so it takes a neutral wordmark and a
 * description that does not claim one.
 */
const configuredName = optionalText(process.env.NEXT_PUBLIC_INSTANCE_NAME);
const name = configuredName ?? "Workspace";
const productName = text(
  process.env.NEXT_PUBLIC_INSTANCE_PRODUCT_NAME,
  `${name} Tasks`,
);
// Neutral for every build, demo or configured. The prefix composes public task
// keys and changelog versions, so a deployment that has not chosen one should
// not ship another deployment's initials. An instance sets its own at first
// deploy, before any keys are shared -- changing it later renames every
// existing `/task/<key>` link.
const taskKeyPrefix = keyPrefix(process.env.NEXT_PUBLIC_TASK_KEY_PREFIX, "TASK");

/**
 * Build-time tier. These compose identifiers, so they are compiled in and shown
 * read-only on the settings page alongside the variable that changes them.
 */
export const instanceBuild = {
  /** Prefix for readable public task keys, e.g. TASK-142 or RMT-142. */
  taskKeyPrefix,
  /** Prefix for changelog versions, e.g. "TASK v5" or "RMT v5". */
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
  /** Whether the "this is a beta" notice appears above the workspace. */
  betaBannerEnabled: boolean;
  /**
   * Whether this workspace takes its own feedback as tasks. True only where
   * the product is being dogfooded by the people who build it; everywhere else
   * a bug report filed here would land in a stranger's backlog.
   */
  feedbackInWorkspace: boolean;
  /**
   * Where the banner sends people instead: an https page or a mailto address.
   * Null shows no link.
   */
  feedbackUrl: string | null;
  /** How much footer to render. See `footerVariants`. */
  footerVariant: InstanceFooterVariant;
  /** Second line under the wordmark. Shown by `branded` and `minimal`. */
  footerSubtitle: string;
  /** Titled link columns; `minimal` flattens them into one inline row. */
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
    configuredName
      ? `The private workspace for the ${name} core team to plan projects and keep work moving.`
      : "A shared workspace for planning projects, assigning tasks, and keeping work moving.",
  ),
  monogram: text(
    process.env.NEXT_PUBLIC_INSTANCE_MONOGRAM,
    name.charAt(0),
  ).charAt(0),
  accentColor: hexColor(process.env.NEXT_PUBLIC_INSTANCE_ACCENT, "#ee1a25"),
  logoPath: assetPath(process.env.NEXT_PUBLIC_INSTANCE_LOGO_PATH),
  betaBannerEnabled: flag(process.env.NEXT_PUBLIC_INSTANCE_BETA_BANNER, true),
  // Off by default. Filing feedback as a task only reaches anyone in the
  // workspace where this product is being built; every other deployment's
  // backlog belongs to its own team.
  feedbackInWorkspace: flag(
    process.env.NEXT_PUBLIC_INSTANCE_FEEDBACK_IN_WORKSPACE,
    false,
  ),
  // Like the build credit below, this names the person who maintains the
  // software rather than whoever the workspace belongs to, so it is the right
  // default for every deployment except the one where the product is built.
  feedbackUrl: feedbackHref(
    process.env.NEXT_PUBLIC_INSTANCE_FEEDBACK_URL,
    "mailto:ryan@ryanmeetup.com",
  ),
  footerVariant: footerVariant(process.env.NEXT_PUBLIC_INSTANCE_FOOTER_VARIANT),
  // Nothing by default: the subtitle sits directly under the wordmark, and an
  // unnamed build has nothing to say there.
  footerSubtitle: text(process.env.NEXT_PUBLIC_INSTANCE_FOOTER_SUBTITLE, ""),
  // The stack this app is built on, which holds for every deployment of it.
  // An instance replaces or empties these from /admin/settings; nothing here
  // is special-cased anywhere in the renderer.
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
  // Social accounts belong to an instance, never to the codebase.
  footerSocials: [],
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
 *
 * The build credit is the deliberate exception. It names who wrote the
 * software rather than who the workspace belongs to, so it is just as true of
 * the demo as of any deployment and stays in place while the organization
 * branding around it goes neutral.
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
  // The demo replaces the beta notice with its own banner, and it is a public
  // showcase, so it neither claims a feedback channel nor publishes an address.
  betaBannerEnabled: false,
  feedbackInWorkspace: false,
  feedbackUrl: null,
  footerVariant: "minimal",
  footerSubtitle: "Team task tracker",
  footerSections: [],
  footerSocials: [],
  creditPrefix: "Website designed and developed by ",
  creditLabel: "Ryan Le",
  creditUrl: "https://ryanle.dev/",
  creditSuffix: ". All Rights Reserved.",
  ogAlt: "Team Tasks — shared team workspace",
  ogHeadline: "Tasks",
  ogTagline: "Shared workspace for your team",
  ogMotto: "Plan it. Assign it. Get it done.",
};

/** Which `InstanceSettings` keys may be cleared back to their default. */
export const nullableInstanceSettings = [
  "logoPath",
  "feedbackUrl",
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
