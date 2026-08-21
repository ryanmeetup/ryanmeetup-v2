import { displayTime, workspaceTimeZoneLabel } from "./calendar-types";
import type {
  GoogleCalendarAttachment,
  GoogleCalendarAttendee,
  GoogleCalendarConferenceEntry,
  GoogleCalendarEvent,
  GoogleCalendarResponse,
} from "./google-calendar-types";

// The details travel with the whole month, so a single event is not allowed to
// dominate the payload. A description past this is cut with the dialog saying
// so, and a very large invite list shows a capped roster beside its real count.
export const GOOGLE_DESCRIPTION_LIMIT = 2000;
export const GOOGLE_ATTENDEE_LIMIT = 50;
export const GOOGLE_CONFERENCE_LIMIT = 6;
export const GOOGLE_ATTACHMENT_LIMIT = 10;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  middot: "·",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  rdquo: "”",
  rsquo: "’",
  times: "×",
};

function decodeEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, entity: string) => {
    if (!entity.startsWith("#"))
      return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
    const code = entity[1]?.toLowerCase() === "x"
      ? Number.parseInt(entity.slice(2), 16)
      : Number.parseInt(entity.slice(1), 10);
    try {
      return String.fromCodePoint(code);
    } catch {
      return match;
    }
  });
}

/**
 * Google stores descriptions as HTML written by whoever created the event, so
 * it is flattened to text rather than rendered. Tags are stripped before
 * entities are decoded, which leaves markup a guest escaped on purpose ("&lt;3")
 * readable as the text they meant instead of turning it back into a tag.
 */
export function flattenGoogleHtml(value: string | null | undefined) {
  if (!value) return "";
  return decodeEntities(
    value
      .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
      .replace(/<\s*br\s*\/?\s*>/gi, "\n")
      // Blocks break on both sides so neighbouring paragraphs keep the blank
      // line between them. List items are the exception: their own bullet marks
      // where they start, and a second break would space the list out.
      .replace(/<\s*(p|div|ul|ol|tr|table|blockquote|h[1-6])\b[^>]*>/gi, "\n")
      .replace(/<\s*\/\s*(p|div|li|tr|ul|ol|h[1-6]|blockquote|table)\s*>/gi, "\n")
      .replace(/<\s*li\b[^>]*>/gi, "• ")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function googleEventDescription(
  value: string | null | undefined,
  limit = GOOGLE_DESCRIPTION_LIMIT,
): Pick<GoogleCalendarEvent, "description" | "descriptionTruncated"> {
  const text = flattenGoogleHtml(value);
  if (!text) return {};
  if (text.length <= limit) return { description: text };
  const clipped = text.slice(0, limit);
  // Cutting on the last space keeps the tail from ending mid-word, unless the
  // only space is near the start and dropping to it would lose most of the cut.
  const boundary = clipped.lastIndexOf(" ");
  const kept = boundary > limit * 0.6 ? clipped.slice(0, boundary) : clipped;
  return { description: `${kept.trimEnd()}…`, descriptionTruncated: true };
}

/** A URL safe to put in an `href`, or null for anything else. */
export function safeLinkUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

const MEETING_PROVIDERS: { host: RegExp; label: string }[] = [
  { host: /^meet\.google\.com$/, label: "Google Meet" },
  { host: /^hangouts\.google\.com$/, label: "Google Hangouts" },
  { host: /(^|\.)zoom\.us$/, label: "Zoom" },
  { host: /(^|\.)zoomgov\.com$/, label: "Zoom" },
  { host: /(^|\.)teams\.microsoft\.com$/, label: "Microsoft Teams" },
  { host: /(^|\.)teams\.live\.com$/, label: "Microsoft Teams" },
  { host: /(^|\.)webex\.com$/, label: "Webex" },
  { host: /^meet\.jit\.si$/, label: "Jitsi Meet" },
  { host: /(^|\.)whereby\.com$/, label: "Whereby" },
  { host: /(^|\.)chime\.aws$/, label: "Amazon Chime" },
  { host: /(^|\.)gotomeeting\.com$/, label: "GoToMeeting" },
  { host: /(^|\.)bluejeans\.com$/, label: "BlueJeans" },
];

export function meetingProviderLabel(value: string | null | undefined) {
  const host = safeLinkUrl(value)?.hostname.toLowerCase();
  if (!host) return null;
  return MEETING_PROVIDERS.find((provider) => provider.host.test(host))?.label ?? null;
}

export type GoogleConferenceSource = {
  hangoutLink?: string;
  location?: string;
  conferenceData?: {
    conferenceSolution?: { name?: string };
    entryPoints?: {
      entryPointType?: string;
      uri?: string;
      label?: string;
      meetingCode?: string;
      pin?: string;
      regionCode?: string;
    }[];
  };
};

const CONFERENCE_KINDS = new Set(["video", "phone", "sip", "more"]);

function dialUri(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && /^tel:[+0-9][0-9\s\-.,;()*#]*$/i.test(trimmed) ? trimmed : null;
}

/**
 * Every way into the meeting, in the order someone joining would want them: the
 * video room first, then dial-in details, then the provider's own fallback
 * page. Google's structured conference data is the source; the plain `location`
 * is scanned only when it holds a known provider's link and nothing structured
 * offered a room, which is how meetings pasted in by hand still get a button.
 */
export function googleConferenceEntries(
  source: GoogleConferenceSource,
  limit = GOOGLE_CONFERENCE_LIMIT,
): GoogleCalendarConferenceEntry[] {
  const solution = source.conferenceData?.conferenceSolution?.name?.trim();
  const entries: GoogleCalendarConferenceEntry[] = [];
  const seen = new Set<string>();
  const add = (entry: GoogleCalendarConferenceEntry) => {
    if (seen.has(entry.uri)) return;
    seen.add(entry.uri);
    entries.push(entry);
  };
  for (const point of source.conferenceData?.entryPoints ?? []) {
    const kind = point.entryPointType ?? "";
    if (!CONFERENCE_KINDS.has(kind)) continue;
    const label = point.label?.trim();
    if (kind === "phone") {
      const uri = dialUri(point.uri);
      if (!uri) continue;
      add({
        kind: "phone",
        label: label || uri.slice(4),
        uri,
        meetingCode: point.meetingCode?.trim() || undefined,
        pin: point.pin?.trim() || undefined,
        regionCode: point.regionCode?.trim() || undefined,
      });
      continue;
    }
    const url = safeLinkUrl(point.uri);
    if (!url) continue;
    add({
      kind: kind === "video" ? "video" : kind === "sip" ? "sip" : "more",
      label:
        kind === "video"
          ? solution || meetingProviderLabel(url.href) || "Video call"
          : kind === "more"
            ? "More ways to join"
            : label || url.href,
      uri: url.href,
      meetingCode: kind === "video" ? point.meetingCode?.trim() || undefined : undefined,
      pin: point.pin?.trim() || undefined,
    });
  }
  const hangout = safeLinkUrl(source.hangoutLink);
  if (hangout)
    add({
      kind: "video",
      label: solution || meetingProviderLabel(hangout.href) || "Google Meet",
      uri: hangout.href,
    });
  if (!entries.some((entry) => entry.kind === "video")) {
    const pasted = source.location?.match(/https?:\/\/[^\s<>"']+/i)?.[0];
    const label = meetingProviderLabel(pasted);
    const url = label ? safeLinkUrl(pasted) : null;
    if (url && label) add({ kind: "video", label, uri: url.href });
  }
  const rank = { video: 0, phone: 1, sip: 2, more: 3 } as const;
  return entries.sort((left, right) => rank[left.kind] - rank[right.kind]).slice(0, limit);
}

const RESPONSE_ORDER: Record<GoogleCalendarResponse, number> = {
  accepted: 0,
  tentative: 1,
  needsAction: 2,
  declined: 3,
};

const RESPONSE_LABELS: Record<GoogleCalendarResponse, string> = {
  accepted: "Going",
  tentative: "Maybe",
  needsAction: "No reply",
  declined: "Not going",
};

export function googleResponseLabel(response: GoogleCalendarResponse) {
  return RESPONSE_LABELS[response];
}

function normalizeResponse(value: string | undefined): GoogleCalendarResponse {
  return value === "accepted" || value === "declined" || value === "tentative"
    ? value
    : "needsAction";
}

export type GoogleAttendeeSource = {
  email?: string;
  displayName?: string;
  responseStatus?: string;
  optional?: boolean;
  organizer?: boolean;
  self?: boolean;
  resource?: boolean;
};

/**
 * Guests in reading order: the connected account first, then the organizer,
 * then everyone else grouped by how they replied. Rooms and equipment are
 * booked as attendees too, so they sort last and are marked as resources.
 */
export function googleAttendees(
  source: GoogleAttendeeSource[] | undefined,
  limit = GOOGLE_ATTENDEE_LIMIT,
) {
  const attendees: GoogleCalendarAttendee[] = (source ?? [])
    .map((attendee) => ({
      email: attendee.email?.trim() || undefined,
      name: attendee.displayName?.trim() || undefined,
      response: normalizeResponse(attendee.responseStatus),
      optional: attendee.optional || undefined,
      organizer: attendee.organizer || undefined,
      self: attendee.self || undefined,
      resource: attendee.resource || undefined,
    }))
    .filter((attendee) => attendee.email || attendee.name);
  if (!attendees.length) return {};
  attendees.sort(
    (left, right) =>
      Number(Boolean(left.resource)) - Number(Boolean(right.resource)) ||
      Number(Boolean(right.self)) - Number(Boolean(left.self)) ||
      Number(Boolean(right.organizer)) - Number(Boolean(left.organizer)) ||
      RESPONSE_ORDER[left.response] - RESPONSE_ORDER[right.response] ||
      googleAttendeeName(left).localeCompare(googleAttendeeName(right)),
  );
  return {
    attendees: attendees.slice(0, limit),
    attendeeCount: attendees.length,
  };
}

export function googleAttendeeName(attendee: {
  name?: string;
  email?: string;
}) {
  return attendee.name || attendee.email || "Guest";
}

export function googleResponseCounts(attendees: GoogleCalendarAttendee[]) {
  const counts: Record<GoogleCalendarResponse, number> = {
    accepted: 0,
    tentative: 0,
    needsAction: 0,
    declined: 0,
  };
  for (const attendee of attendees)
    if (!attendee.resource) counts[attendee.response] += 1;
  return counts;
}

export function googleAttachments(
  source: { title?: string; fileUrl?: string }[] | undefined,
  limit = GOOGLE_ATTACHMENT_LIMIT,
): GoogleCalendarAttachment[] {
  return (source ?? [])
    .flatMap((attachment) => {
      const url = safeLinkUrl(attachment.fileUrl);
      return url
        ? [{ title: attachment.title?.trim() || url.hostname, url: url.href }]
        : [];
    })
    .slice(0, limit);
}

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const formatDate = (formatter: Intl.DateTimeFormat, date: string) =>
  formatter.format(new Date(`${date}T00:00:00Z`));

/**
 * The full "when" line for the details dialog. Unlike a tile it has room to
 * name the day, so a reader never has to work out which date they clicked.
 */
export function googleEventWhen(
  event: Pick<GoogleCalendarEvent, "start" | "end" | "allDay" | "startTime" | "endTime">,
) {
  const sameDay = event.start === event.end;
  if (event.allDay)
    return sameDay
      ? `${formatDate(longDateFormatter, event.start)} · All day`
      : `${formatDate(shortDateFormatter, event.start)} – ${formatDate(shortDateFormatter, event.end)} · All day`;
  const zone = workspaceTimeZoneLabel(event.start);
  const start = event.startTime ? displayTime(event.startTime) : "";
  const end = event.endTime ? displayTime(event.endTime) : "";
  if (sameDay) {
    const hours = start && end ? `${start} – ${end}` : start || end;
    return hours
      ? `${formatDate(longDateFormatter, event.start)} · ${hours} ${zone}`.trim()
      : formatDate(longDateFormatter, event.start);
  }
  const from = `${formatDate(shortDateFormatter, event.start)}${start ? `, ${start}` : ""}`;
  const to = `${formatDate(shortDateFormatter, event.end)}${end ? `, ${end}` : ""}`;
  return `${from} – ${to} ${zone}`.trim();
}

export type LinkedTextPart = { key: string; text: string; url?: string };

/**
 * Splits flattened description text so the links inside it stay clickable
 * without ever handing raw HTML to the browser.
 */
export function linkedTextParts(text: string): LinkedTextPart[] {
  const parts: LinkedTextPart[] = [];
  const pattern = /https?:\/\/[^\s<>"']+/gi;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    // Sentence punctuation and a closing bracket the link never opened belong
    // to the prose around it, not to the address.
    let candidate = match[0];
    while (
      /[.,;:!?]$/.test(candidate) ||
      (candidate.endsWith(")") &&
        candidate.split(")").length > candidate.split("(").length)
    )
      candidate = candidate.slice(0, -1);
    const url = safeLinkUrl(candidate);
    if (!url) continue;
    if (at > index)
      parts.push({ key: `text:${index}`, text: text.slice(index, at) });
    parts.push({ key: `link:${at}`, text: candidate, url: url.href });
    index = at + candidate.length;
  }
  if (index < text.length)
    parts.push({ key: `text:${index}`, text: text.slice(index) });
  return parts;
}
