/**
 * Digest cadence and structure, owned by the `digest_settings` singleton row
 * rather than by `vercel.json`. The Vercel worker runs every hour; this module
 * decides whether a given hour is a send slot and how the message is composed,
 * so changing the schedule is an edit in `/admin/usage`, not a redeploy.
 *
 * Pure and client-safe: the settings modals and the worker share it.
 */

export const DIGEST_SECTION_KEYS = [
  "overdue",
  "dueToday",
  "upcoming",
  "highPriority",
  "recentlyUpdated",
] as const;

export type DigestSectionKey = (typeof DIGEST_SECTION_KEYS)[number];

/** Presentation for each section, in the order the structure editor lists them. */
export const DIGEST_SECTION_META: Record<
  DigestSectionKey,
  { label: string; description: string; emoji: string; iconBackground: string }
> = {
  overdue: {
    label: "Overdue",
    description: "Past the finish line and still open.",
    emoji: "🚨",
    iconBackground: "#fee2e2",
  },
  dueToday: {
    label: "Due today",
    description: "The work landing today.",
    emoji: "📅",
    iconBackground: "#dbeafe",
  },
  upcoming: {
    label: "Coming up",
    description: "Due inside the upcoming window.",
    emoji: "⏳",
    iconBackground: "#fef3c7",
  },
  highPriority: {
    label: "High priority",
    description: "Important work that still needs a deadline.",
    emoji: "🔥",
    iconBackground: "#ffedd5",
  },
  recentlyUpdated: {
    label: "Recently updated",
    description: "Assigned work that changed inside the recent window.",
    emoji: "✨",
    iconBackground: "#ede9fe",
  },
};

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type DigestSettings = {
  enabled: boolean;
  /** Days the worker may send on, as `Date.getDay()` indexes. */
  weekdays: number[];
  /** Hour of the day, in `timeZone`, the worker creates the messages. */
  sendHour: number;
  timeZone: string;
  /** Minutes between creating a message in Resend and its delivery. */
  reviewMinutes: number;
  /** How many days ahead "Coming up" reaches. */
  upcomingDays: number;
  /** How far back "Recently updated" looks. */
  recentDays: number;
  /** Enabled sections, in the order they appear in the message. */
  sections: DigestSectionKey[];
  /** Ceiling on messages created per run, to stay inside the Resend quota. */
  maxRecipients: number;
};

export const digestDefaults: DigestSettings = {
  enabled: true,
  weekdays: [1, 2, 3, 4, 5],
  sendHour: 9,
  timeZone: "America/New_York",
  reviewMinutes: 30,
  upcomingDays: 3,
  recentDays: 3,
  sections: [...DIGEST_SECTION_KEYS],
  maxRecipients: 90,
};

export const DIGEST_LIMITS = {
  reviewMinutes: { min: 5, max: 1440 },
  upcomingDays: { min: 1, max: 30 },
  recentDays: { min: 1, max: 30 },
  maxRecipients: { min: 1, max: 90 },
  sendHour: { min: 0, max: 23 },
} as const;

const clampInteger = (
  value: unknown,
  { min, max }: { min: number; max: number },
  fallback: number,
) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : fallback;
};

export const isDigestSectionKey = (value: unknown): value is DigestSectionKey =>
  typeof value === "string" &&
  (DIGEST_SECTION_KEYS as readonly string[]).includes(value);

/** True when `value` names a zone this runtime can format in. */
export function isSupportedTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Deduplicated section list; falls back to the full set when nothing is left. */
export function normalizeSections(value: unknown): DigestSectionKey[] {
  if (!Array.isArray(value)) return [...digestDefaults.sections];
  const sections = [...new Set(value.filter(isDigestSectionKey))];
  return sections.length ? sections : [...digestDefaults.sections];
}

/** Sorted, deduplicated day list; falls back to weekdays when nothing is left. */
export function normalizeWeekdays(value: unknown): number[] {
  if (!Array.isArray(value)) return [...digestDefaults.weekdays];
  const days = [
    ...new Set(
      value.filter(
        (day): day is number => Number.isInteger(day) && day >= 0 && day <= 6,
      ),
    ),
  ].sort((left, right) => left - right);
  return days.length ? days : [...digestDefaults.weekdays];
}

export type DigestSettingsRow = {
  enabled?: unknown;
  weekdays?: unknown;
  send_hour?: unknown;
  time_zone?: unknown;
  review_minutes?: unknown;
  upcoming_days?: unknown;
  recent_days?: unknown;
  sections?: unknown;
  max_recipients?: unknown;
};

/**
 * Stored row to usable settings. Every field falls back independently so a row
 * written by an older deploy, or a partially populated one, still resolves.
 */
export function resolveDigestSettings(
  row: DigestSettingsRow | null,
): DigestSettings {
  if (!row) return { ...digestDefaults, sections: [...digestDefaults.sections] };
  return {
    enabled:
      typeof row.enabled === "boolean" ? row.enabled : digestDefaults.enabled,
    weekdays: normalizeWeekdays(row.weekdays),
    sendHour: clampInteger(
      row.send_hour,
      DIGEST_LIMITS.sendHour,
      digestDefaults.sendHour,
    ),
    timeZone: isSupportedTimeZone(row.time_zone)
      ? row.time_zone
      : digestDefaults.timeZone,
    reviewMinutes: clampInteger(
      row.review_minutes,
      DIGEST_LIMITS.reviewMinutes,
      digestDefaults.reviewMinutes,
    ),
    upcomingDays: clampInteger(
      row.upcoming_days,
      DIGEST_LIMITS.upcomingDays,
      digestDefaults.upcomingDays,
    ),
    recentDays: clampInteger(
      row.recent_days,
      DIGEST_LIMITS.recentDays,
      digestDefaults.recentDays,
    ),
    sections: normalizeSections(row.sections),
    maxRecipients: clampInteger(
      row.max_recipients,
      DIGEST_LIMITS.maxRecipients,
      digestDefaults.maxRecipients,
    ),
  };
}

export function rowFromDigestSettings(settings: DigestSettings) {
  return {
    enabled: settings.enabled,
    weekdays: settings.weekdays,
    send_hour: settings.sendHour,
    time_zone: settings.timeZone,
    review_minutes: settings.reviewMinutes,
    upcoming_days: settings.upcomingDays,
    recent_days: settings.recentDays,
    sections: settings.sections,
    max_recipients: settings.maxRecipients,
  };
}

/** Calendar date, hour, and weekday of `date` as observed in `timeZone`. */
export function zonedParts(date: Date, timeZone: string) {
  const parts = new Map(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    parts.get("weekday") ?? "",
  );
  return {
    date: `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`,
    hour: Number(parts.get("hour")),
    weekday,
  };
}

/** The workspace-local date the digest is classified against. */
export const digestDateFor = (settings: DigestSettings, now: Date) =>
  zonedParts(now, settings.timeZone).date;

/**
 * Whether `now` falls in a configured send slot. The worker runs hourly, so a
 * slot is one whole hour: a run that is retried, or that arrives late inside
 * the same hour, still matches. Same-day duplicates are prevented by the run
 * ledger and by Resend's idempotency key, not by this check.
 */
export function isDigestSlot(settings: DigestSettings, now: Date) {
  if (!settings.enabled) return false;
  const { hour, weekday } = zonedParts(now, settings.timeZone);
  return settings.weekdays.includes(weekday) && hour === settings.sendHour;
}

/**
 * The next slot the worker would send in, or `null` when sending is off.
 *
 * Always strictly in the future: mid-slot, the current hour's run has already
 * begun, so reporting it as "next" would be wrong. Walks hour by hour rather
 * than doing zone arithmetic, so DST shifts resolve through the same formatter
 * the worker uses.
 */
export function nextDigestRun(settings: DigestSettings, now: Date) {
  if (!settings.enabled || !settings.weekdays.length) return null;
  const topOfHour = new Date(now);
  topOfHour.setUTCMinutes(0, 0, 0);
  for (let step = 0; step <= 24 * 8; step += 1) {
    const candidate = new Date(topOfHour.getTime() + step * 60 * 60 * 1000);
    if (candidate < now) continue;
    const { hour, weekday } = zonedParts(candidate, settings.timeZone);
    if (settings.weekdays.includes(weekday) && hour === settings.sendHour)
      return candidate;
  }
  return null;
}

/** "9:00 AM EDT, Mon–Fri" style summary for the settings card. */
export function describeCadence(settings: DigestSettings) {
  if (!settings.enabled) return "Paused";
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 0, 1, settings.sendHour)));
  const days = settings.weekdays.map((day) => WEEKDAY_LABELS[day].slice(0, 3));
  const isWeekdays =
    settings.weekdays.length === 5 && settings.weekdays.every((d) => d >= 1 && d <= 5);
  const dayLabel =
    settings.weekdays.length === 7
      ? "every day"
      : isWeekdays
        ? "Mon–Fri"
        : days.join(", ");
  return `${time} ${settings.timeZone.split("/").at(-1)?.replace(/_/g, " ")}, ${dayLabel}`;
}
