import type { InstanceSettings } from "@/lib/instance";

/**
 * The banner's sentence, as data.
 *
 * What the notice says is per-instance free text, so nothing here composes a
 * sentence around the workspace's name: the wordmark belongs to one deployment
 * and would read as though the product were named after it. All this module
 * decides is how the owner's message and the optional link fit together.
 * Composing that here rather than in the banner keeps the admin preview and
 * the live banner from drifting, and makes the wording testable without React.
 */
export type BannerSegment =
  | { kind: "text"; value: string }
  | { kind: "link"; href: string; value: string };

type BannerSettings = Pick<
  InstanceSettings,
  "bannerEnabled" | "bannerMessage" | "bannerLinkUrl" | "bannerLinkLabel"
>;

/**
 * What the link reads as. An instance that has not written a label gets one
 * derived from the address, since a bare mailto: URL is not something to show
 * a member and "Learn more" says as much as a page's own URL would.
 */
export function bannerLinkText(href: string, label: string | null) {
  if (label?.trim()) return label.trim();
  return href.startsWith("mailto:")
    ? `Email ${href.slice("mailto:".length)}`
    : "Learn more";
}

/**
 * The notice, or null when this instance has turned it off or left it empty.
 * The link is dropped when there is nowhere to send anyone, so the banner
 * never offers a destination it does not have.
 */
export function bannerSegments(
  settings: BannerSettings,
): BannerSegment[] | null {
  const { bannerEnabled, bannerMessage, bannerLinkUrl, bannerLinkLabel } =
    settings;
  if (!bannerEnabled) return null;

  const message = bannerMessage.trim();
  if (!bannerLinkUrl)
    return message ? [{ kind: "text", value: message }] : null;

  const segments: BannerSegment[] = [];
  // The message is printed verbatim and the link follows it as its own clause,
  // so an owner who ends on a question keeps the question mark and one who
  // wants no preamble at all gets a bare link.
  if (message) segments.push({ kind: "text", value: `${message} ` });
  segments.push({
    kind: "link",
    href: bannerLinkUrl,
    value: bannerLinkText(bannerLinkUrl, bannerLinkLabel),
  });
  return segments;
}

/** The same sentence as plain text, for tests and non-interactive previews. */
export function bannerText(settings: BannerSettings) {
  return (
    bannerSegments(settings)
      ?.map((segment) => segment.value)
      .join("") ?? null
  );
}
