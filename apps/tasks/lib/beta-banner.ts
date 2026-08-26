import type { InstanceSettings } from "@/lib/instance";

/**
 * The beta notice's sentence, as data.
 *
 * What the banner may say is per-instance: only the workspace where this
 * product is dogfooded takes feedback as its own tasks, and everyone else is
 * pointed at a link the owner set. Composing the sentence here rather than in
 * the banner keeps the admin preview and the live banner from drifting, and
 * makes the wording testable without React.
 */
export type BetaBannerSegment =
  | { kind: "text"; value: string }
  | { kind: "link"; href: string; value: string };

type FeedbackSettings = Pick<
  InstanceSettings,
  "productName" | "betaBannerEnabled" | "feedbackInWorkspace" | "feedbackUrl"
>;

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** The link's phrasing, lower-cased so it can sit mid-sentence. */
function linkPhrase(href: string) {
  return href.startsWith("mailto:")
    ? `email ${href.slice("mailto:".length)}`
    : "send feedback";
}

/**
 * The notice, or null when this instance has turned it off. The prompt is
 * dropped entirely when there is nowhere to send anyone, so the banner never
 * asks for feedback it cannot receive.
 */
export function betaBannerSegments(
  settings: FeedbackSettings,
): BetaBannerSegment[] | null {
  const { productName, betaBannerEnabled, feedbackInWorkspace, feedbackUrl } =
    settings;
  if (!betaBannerEnabled) return null;

  const opening = `${productName} is in beta.`;
  if (!feedbackInWorkspace && !feedbackUrl)
    return [{ kind: "text", value: opening }];

  const segments: BetaBannerSegment[] = [
    { kind: "text", value: `${opening} Found an issue or have an idea? ` },
  ];

  if (feedbackInWorkspace)
    segments.push({
      kind: "text",
      value: feedbackUrl
        ? "File a task in this workspace, or "
        : "File a task in this workspace.",
    });

  if (feedbackUrl) {
    const phrase = linkPhrase(feedbackUrl);
    segments.push({
      kind: "link",
      href: feedbackUrl,
      value: feedbackInWorkspace ? phrase : capitalize(phrase),
    });
    segments.push({ kind: "text", value: "." });
  }

  return segments;
}

/** The same sentence as plain text, for tests and non-interactive previews. */
export function betaBannerText(settings: FeedbackSettings) {
  return (
    betaBannerSegments(settings)
      ?.map((segment) => segment.value)
      .join("") ?? null
  );
}
