import { displayTime, workspaceTimeZoneLabel } from "./calendar-types";
import { WORKSPACE_TIME_ZONE } from "./google-calendar-sync";
import type {
  GoogleCalendarAttachment,
  GoogleCalendarAttendee,
  GoogleCalendarConferenceEntry,
  GoogleCalendarEvent,
  GoogleCalendarPerson,
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
 * An address lives in the anchor's `href`, so stripping the tag would leave
 * label text like "Find a local number" pointing nowhere. The address is
 * written out beside its label, where the link finder picks it up again, unless
 * the label already spells the address out itself.
 */
function unwrapAnchors(value: string) {
  return value.replace(
    /<a\b[^>]*\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))[^>]*>([\s\S]*?)<\s*\/\s*a\s*>/gi,
    (_match, double, single, bare, inner: string) => {
      const label = inner.replace(/<[^>]*>/g, "").trim();
      const url = safeLinkUrl(decodeEntities((double ?? single ?? bare ?? "").trim()));
      if (!url) return label;
      if (!label) return url.href;
      return label.includes(url.href) || label.includes(url.hostname)
        ? label
        : `${label} (${url.href})`;
    },
  );
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
    unwrapAnchors(
      value.replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, ""),
    )
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
  // Still HTML at this point. Providers that Google has no conference data for
  // write their joining details here and nowhere else.
  description?: string;
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

// A number written for a human to dial, with the extension some providers hang
// off it: "+1 929-229-5233,,545797412#".
const DIAL_IN = /(?:^|[\s(])(\+\d[\d\s\-.()]{6,}\d)((?:,{1,2}\d+)*#?)/;
const MEETING_CODE = /\bmeeting id:[ \t]*([\d][\d \t]*\d)/i;
const PASSCODE = /\b(?:passcode|password|pin):[ \t]*(\S+)/i;

/**
 * Joining details read out of prose. An invite that Google has no conference
 * data for — anything organized outside Workspace, most often Teams — carries
 * its room as a link in the body, so the link is lifted out along with the
 * meeting ID, passcode, and dial-in number written beside it. Only a known
 * provider's address counts, which keeps an agenda full of ordinary links from
 * turning into a join button, and the dial-in rides along only once that
 * address is found so a phone number in unrelated prose is left alone.
 */
function conferenceFromText(text: string | null | undefined) {
  const entries: GoogleCalendarConferenceEntry[] = [];
  if (!text) return entries;
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    let candidate = match[0];
    while (/[.,;:!?)\]]$/.test(candidate)) candidate = candidate.slice(0, -1);
    const label = meetingProviderLabel(candidate);
    const url = label ? safeLinkUrl(candidate) : null;
    if (!label || !url) continue;
    entries.push({
      kind: "video",
      label,
      uri: url.href,
      meetingCode: text.match(MEETING_CODE)?.[1].replace(/\s+/g, " ").trim(),
      pin: text.match(PASSCODE)?.[1],
    });
    const dial = text.match(DIAL_IN);
    const number = dial && `${dial[1].trim()}${dial[2] ?? ""}`;
    const uri = number && dialUri(`tel:${number.replace(/[\s()]/g, "")}`);
    if (number && uri) entries.push({ kind: "phone", label: number, uri });
    return entries;
  }
  return entries;
}

/**
 * Every way into the meeting, in the order someone joining would want them: the
 * video room first, then dial-in details, then the provider's own fallback
 * page. Google's structured conference data is the source; the location and
 * then the description are read only when nothing structured offered a room,
 * which is how a meeting pasted in by hand, or booked in Teams and mirrored
 * here, still gets a button instead of a link buried in its notes.
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
    const written = conferenceFromText(source.location);
    for (const entry of written.length
      ? written
      : conferenceFromText(flattenGoogleHtml(source.description)))
      add(entry);
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

const RESOURCE_DOMAIN = /@resource\.calendar\.google\.com$/i;

const locationSegments = (location: string | undefined) =>
  (location ?? "")
    .split(/[;\n]/)
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);

/**
 * Whether an attendee is a room or a piece of equipment rather than a guest.
 * Google marks the resource calendars it manages, but a room booked on the
 * organization's own domain arrives looking like any other invitee, and the
 * giveaway is the location naming it. Only a location segment that is nothing
 * but the attendee's one-word name counts, so a guest called Ryan meeting at
 * "Ryan's bar" is still read as a person.
 */
function isResource(attendee: GoogleCalendarAttendee, segments: string[]) {
  if (attendee.resource) return true;
  if (attendee.email && RESOURCE_DOMAIN.test(attendee.email)) return true;
  const name = attendee.name?.trim().toLowerCase();
  return Boolean(name && !/\s/.test(name) && segments.includes(name));
}

/**
 * Guests in reading order: the connected account first, then the organizer,
 * then everyone else grouped by how they replied. Rooms and equipment are
 * booked as attendees too, so they sort last and are marked as resources, and
 * they are counted apart from the people so a head count of the guests never
 * includes the conference room they booked.
 */
export function googleAttendees(
  source: GoogleAttendeeSource[] | undefined,
  { limit = GOOGLE_ATTENDEE_LIMIT, location }: { limit?: number; location?: string } = {},
) {
  const segments = locationSegments(location);
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
    .filter((attendee) => attendee.email || attendee.name)
    .map((attendee) => ({
      ...attendee,
      resource: isResource(attendee, segments) || undefined,
    }));
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
    guestCount: attendees.filter((attendee) => !attendee.resource).length,
  };
}

/**
 * The location with the rooms taken out of it. Workspace writes a booked room
 * into the location as well as the guest list, so leaving it in both prints the
 * room twice; what is left is the part of the location the room list cannot
 * say. Segments are rejoined as Google wrote them, and a location that was
 * nothing but its rooms drops out entirely.
 */
export function googleEventPlace(
  location: string | undefined,
  rooms: GoogleCalendarPerson[],
) {
  if (!location) return undefined;
  const names = new Set(rooms.map((room) => googleAttendeeName(room).toLowerCase()));
  return (
    location
      .split(";")
      .map((segment) => segment.trim())
      .filter((segment) => segment && !names.has(segment.toLowerCase()))
      .join("; ") || undefined
  );
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

export type GoogleNoteBlock =
  | { key: string; kind: "rule" }
  | { key: string; kind: "text"; text: string };

// A row of typed punctuation standing in for a horizontal rule. Providers pad
// these out to the width of the mail they were written for.
const RULE_LINE = /^[\s]*[_\-=–—*]{5,}[\s]*$/;

/**
 * Description text split into what each part should render as. Invites written
 * by a meeting provider separate their sections with typed-out rules, which
 * read as a stray row of underscores once the markup around them is gone, so
 * those become real separators. A rule with nothing on one side of it was
 * decoration for a boundary the dialog already draws, and is dropped.
 */
export function googleNoteBlocks(text: string): GoogleNoteBlock[] {
  const blocks: GoogleNoteBlock[] = [];
  let buffer: string[] = [];
  const flush = (index: number) => {
    const joined = buffer.join("\n").trim();
    buffer = [];
    if (joined) blocks.push({ key: `text:${index}`, kind: "text", text: joined });
  };
  text.split("\n").forEach((line, index) => {
    if (!RULE_LINE.test(line)) {
      buffer.push(line);
      return;
    }
    flush(index);
    if (blocks.at(-1)?.kind === "text") blocks.push({ key: `rule:${index}`, kind: "rule" });
  });
  flush(text.length);
  return blocks.at(-1)?.kind === "rule" ? blocks.slice(0, -1) : blocks;
}

const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

/** Today's date in the workspace zone, as the calendar writes dates. */
export function workspaceToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WORKSPACE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function distanceLabel(days: number, past: boolean) {
  if (days === 1) return past ? "Yesterday" : "Tomorrow";
  if (days < 14) return past ? `${days} days ago` : `In ${days} days`;
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return past ? `${weeks} weeks ago` : `In ${weeks} weeks`;
  }
  const months = Math.round(days / 30);
  return past ? `${months} months ago` : `In ${months} months`;
}

/**
 * Which side of now the event sits on. A date alone reads the same whether it
 * is next week or last year, and the dialog opens on both, so it says which in
 * the words a reader would use. An event running today is called out as today
 * however many days it spans.
 */
export function googleEventRelativeWhen(
  event: Pick<GoogleCalendarEvent, "start" | "end">,
  today = workspaceToday(),
) {
  const now = dayNumber(today);
  const start = dayNumber(event.start);
  const end = dayNumber(event.end || event.start);
  if (now >= start && now <= end) return { label: "Today", past: false };
  return start > now
    ? { label: distanceLabel(start - now, false), past: false }
    : { label: distanceLabel(now - end, true), past: true };
}
