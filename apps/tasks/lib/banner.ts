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
  | "name"
  | "bannerEnabled"
  | "bannerMessage"
  | "bannerLinkUrl"
  | "bannerLinkLabel"
>;

/** The address a mailto sends to, without the prefill it may carry. */
function mailtoAddress(href: string) {
  return href.slice("mailto:".length).split("?")[0];
}

/**
 * The draft a bare mailto opens with.
 *
 * A banner that invites a bug report and then opens an empty message gets
 * empty messages back, so the link seeds the subject and the two things
 * whoever reads it will otherwise have to ask for. The subject names the
 * workspace because the address on the other end may take mail from more than
 * one instance -- it is metadata for the recipient's inbox, not part of the
 * notice, which still names nothing.
 *
 * Only a bare address is filled in. An owner who wrote their own query string
 * has already said what the message should look like, and an https link is
 * left exactly as it was given.
 */
export function bannerMailtoHref(href: string, workspace: string) {
  if (!href.startsWith("mailto:") || href.includes("?")) return href;

  const subject = `Feedback: ${workspace}`;
  const body = [
    "What's the issue or idea?",
    "",
    "",
    "Where in the workspace (page, task, or link):",
    "",
    "",
    "Anything else that would help (screenshot, browser):",
    "",
  ].join("\n");

  return `mailto:${mailtoAddress(href)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

/**
 * What the link reads as. An instance that has not written a label gets one
 * derived from the address, since a bare mailto: URL is not something to show
 * a member and "Learn more" says as much as a page's own URL would. Only the
 * address is read out: the prefilled subject and body are for the mail client.
 */
export function bannerLinkText(href: string, label: string | null) {
  if (label?.trim()) return label.trim();
  return href.startsWith("mailto:")
    ? `Email ${mailtoAddress(href)}`
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
    href: bannerMailtoHref(bannerLinkUrl, settings.name),
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
