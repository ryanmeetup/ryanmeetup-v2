// Calendar entries in this app are day-scoped: a recurrence repeats the date
// span itself and never a time of day, so every rule here is expressed and
// expanded in `YYYY-MM-DD` values with UTC math. That keeps a repeat meaning
// the same day for every reader regardless of their zone.

export type CalendarRecurrenceFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

export type CalendarRecurrenceEnd =
  | { type: "never" }
  | { type: "on"; date: string }
  | { type: "after"; count: number };

export type CalendarRecurrence = {
  frequency: CalendarRecurrenceFrequency;
  interval: number;
  // Weekly only. 0 is Sunday, matching `Date.getUTCDay`.
  weekdays: number[];
  // Monthly only: repeat on the same day number or on the same weekday
  // position, the way "the 7th" differs from "the first Monday".
  monthlyMode: "date" | "weekday";
  ends: CalendarRecurrenceEnd;
};

export type CalendarOccurrence = {
  start: string;
  end: string;
};

export const MAX_RECURRENCE_INTERVAL = 99;
export const MAX_RECURRENCE_COUNT = 365;
// A rule that repeats forever is expanded per visible range, so this only
// guards against a pathological range or a rule that never lands on a date.
const MAX_STEPS = 1000;

const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
// The letters a week of toggles is labelled with; the full name stays available
// to screen readers.
export const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];
const ORDINAL_NAMES = ["first", "second", "third", "fourth", "last"];
const WEEKDAY_SET = [1, 2, 3, 4, 5];

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const utc = (date: string) => new Date(`${date}T00:00:00Z`);
const iso = (value: Date) => value.toISOString().slice(0, 10);

export function addDays(date: string, amount: number) {
  const value = utc(date);
  value.setUTCDate(value.getUTCDate() + amount);
  return iso(value);
}

export function daysBetween(from: string, to: string) {
  return Math.round((utc(to).getTime() - utc(from).getTime()) / 86_400_000);
}

export function weekdayOf(date: string) {
  return utc(date).getUTCDay();
}

const partsOf = (date: string) => {
  const value = utc(date);
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth(),
    day: value.getUTCDate(),
  };
};

const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

const fromParts = (year: number, month: number, day: number) =>
  iso(new Date(Date.UTC(year, month, day)));

// A start date in the last week of its month reads as "the last Monday", which
// is also how the rule should behave in months with only four of them.
export function weekdayOrdinal(date: string) {
  const { year, month, day } = partsOf(date);
  const position = Math.ceil(day / 7);
  return position >= 5 || day + 7 > daysInMonth(year, month) ? 5 : position;
}

function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  ordinal: number,
) {
  if (ordinal >= 5) {
    const last = daysInMonth(year, month);
    const lastWeekday = new Date(Date.UTC(year, month, last)).getUTCDay();
    return last - ((lastWeekday - weekday + 7) % 7);
  }
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const day = 1 + ((weekday - firstWeekday + 7) % 7) + (ordinal - 1) * 7;
  return day <= daysInMonth(year, month) ? day : null;
}

export const sortedWeekdays = (weekdays: number[]) =>
  [...new Set(weekdays)].filter((day) => day >= 0 && day <= 6).sort((a, b) => a - b);

const isWeekdaySet = (weekdays: number[]) =>
  weekdays.length === 5 && weekdays.every((day, index) => day === WEEKDAY_SET[index]);

export function recurrenceEquals(
  left: CalendarRecurrence | null,
  right: CalendarRecurrence | null,
) {
  if (!left || !right) return left === right;
  return (
    left.frequency === right.frequency &&
    left.interval === right.interval &&
    left.monthlyMode === right.monthlyMode &&
    left.weekdays.join() === right.weekdays.join() &&
    left.ends.type === right.ends.type &&
    (left.ends.type !== "on" ||
      left.ends.date === (right.ends as { date: string }).date) &&
    (left.ends.type !== "after" ||
      left.ends.count === (right.ends as { count: number }).count)
  );
}

// Rules arrive from the database as untyped JSON and from requests as untrusted
// input, so both go through the same parse instead of being cast.
export function parseRecurrence(value: unknown): CalendarRecurrence | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rule = value as Record<string, unknown>;
  const frequency = rule.frequency;
  if (
    frequency !== "daily" &&
    frequency !== "weekly" &&
    frequency !== "monthly" &&
    frequency !== "yearly"
  )
    return null;
  const interval = rule.interval;
  if (
    typeof interval !== "number" ||
    !Number.isInteger(interval) ||
    interval < 1 ||
    interval > MAX_RECURRENCE_INTERVAL
  )
    return null;
  const rawWeekdays = rule.weekdays;
  if (
    !Array.isArray(rawWeekdays) ||
    rawWeekdays.some(
      (day) => typeof day !== "number" || !Number.isInteger(day) || day < 0 || day > 6,
    )
  )
    return null;
  const weekdays = sortedWeekdays(rawWeekdays as number[]);
  if (frequency === "weekly" && !weekdays.length) return null;
  const monthlyMode = rule.monthlyMode;
  if (monthlyMode !== "date" && monthlyMode !== "weekday") return null;
  const ends = parseEnd(rule.ends);
  if (!ends) return null;
  return {
    frequency,
    interval,
    weekdays: frequency === "weekly" ? weekdays : [],
    monthlyMode: frequency === "monthly" ? monthlyMode : "date",
    ends,
  };
}

function parseEnd(value: unknown): CalendarRecurrenceEnd | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const ends = value as Record<string, unknown>;
  if (ends.type === "never") return { type: "never" };
  if (ends.type === "on")
    return typeof ends.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ends.date)
      ? { type: "on", date: ends.date }
      : null;
  if (ends.type === "after")
    return typeof ends.count === "number" &&
      Number.isInteger(ends.count) &&
      ends.count >= 1 &&
      ends.count <= MAX_RECURRENCE_COUNT
      ? { type: "after", count: ends.count }
      : null;
  return null;
}

// The dates a single step of the rule lands on. Weekly steps can produce
// several; a month without the requested day produces none.
function stepDates(start: string, rule: CalendarRecurrence, step: number) {
  const { year, month, day } = partsOf(start);
  if (rule.frequency === "daily") return [addDays(start, step * rule.interval)];
  if (rule.frequency === "weekly") {
    const weekStart = addDays(start, -weekdayOf(start) + step * rule.interval * 7);
    return sortedWeekdays(rule.weekdays).map((weekday) =>
      addDays(weekStart, weekday),
    );
  }
  if (rule.frequency === "monthly") {
    const target = new Date(Date.UTC(year, month + step * rule.interval, 1));
    const targetYear = target.getUTCFullYear();
    const targetMonth = target.getUTCMonth();
    if (rule.monthlyMode === "weekday") {
      const targetDay = nthWeekdayOfMonth(
        targetYear,
        targetMonth,
        weekdayOf(start),
        weekdayOrdinal(start),
      );
      return targetDay ? [fromParts(targetYear, targetMonth, targetDay)] : [];
    }
    return day <= daysInMonth(targetYear, targetMonth)
      ? [fromParts(targetYear, targetMonth, day)]
      : [];
  }
  const targetYear = year + step * rule.interval;
  return day <= daysInMonth(targetYear, month)
    ? [fromParts(targetYear, month, day)]
    : [];
}

const periodDays = (rule: CalendarRecurrence) =>
  rule.frequency === "daily"
    ? rule.interval
    : rule.frequency === "weekly"
      ? rule.interval * 7
      : rule.frequency === "monthly"
        ? rule.interval * 28
        : rule.interval * 365;

// Rules that run forever are only expanded around the range being drawn, so the
// first step is found by arithmetic instead of by counting from the beginning.
function firstStepFor(start: string, rule: CalendarRecurrence, rangeStart: string) {
  if (rangeStart <= start) return 0;
  const startParts = partsOf(start);
  const rangeParts = partsOf(rangeStart);
  const elapsed =
    rule.frequency === "daily"
      ? daysBetween(start, rangeStart)
      : rule.frequency === "weekly"
        ? Math.floor(daysBetween(start, rangeStart) / 7)
        : rule.frequency === "monthly"
          ? (rangeParts.year - startParts.year) * 12 +
            (rangeParts.month - startParts.month)
          : rangeParts.year - startParts.year;
  // Two steps of slack cover a span that began before the range and a weekly
  // rule whose selected days sit earlier in the week than the start date.
  return Math.max(0, Math.floor(elapsed / rule.interval) - 2);
}

/**
 * Every occurrence of an entry that overlaps `range`, including entries that do
 * not repeat. An occurrence is identified by its start date, which is unique
 * within a series.
 */
export function occurrencesInRange(
  entry: { startDate: string; endDate: string; recurrence: unknown },
  range: { start: string; end: string },
): CalendarOccurrence[] {
  const duration = Math.max(0, daysBetween(entry.startDate, entry.endDate));
  const rule = parseRecurrence(entry.recurrence);
  if (!rule)
    return entry.startDate <= range.end && entry.endDate >= range.start
      ? [{ start: entry.startDate, end: entry.endDate }]
      : [];
  const until = rule.ends.type === "on" ? rule.ends.date : null;
  // A capped series is counted from its first occurrence, so it is expanded
  // from the beginning; an open-ended one can safely start near the range.
  const limit = rule.ends.type === "after" ? rule.ends.count : Number.POSITIVE_INFINITY;
  const counted = Number.isFinite(limit);
  const firstStep = counted
    ? 0
    : firstStepFor(entry.startDate, rule, addDays(range.start, -duration));
  const steps = Math.min(
    MAX_STEPS,
    counted
      ? MAX_RECURRENCE_COUNT + 1
      : Math.ceil(daysBetween(range.start, range.end) / periodDays(rule)) + 4,
  );
  const occurrences: CalendarOccurrence[] = [];
  let taken = 0;
  for (let step = firstStep; step < firstStep + steps; step += 1) {
    for (const start of stepDates(entry.startDate, rule, step)) {
      if (start < entry.startDate) continue;
      if (until && start > until) return occurrences;
      if (taken >= limit) return occurrences;
      taken += 1;
      if (start > range.end) return occurrences;
      const end = addDays(start, duration);
      if (end >= range.start) occurrences.push({ start, end });
    }
  }
  return occurrences;
}

/**
 * Repeating a span more often than the span itself lasts would stack an entry on
 * top of its own earlier copy, so it is rejected rather than drawn twice.
 */
export function recurrenceSpanConflict(
  startDate: string,
  endDate: string,
  recurrence: unknown,
) {
  const rule = parseRecurrence(recurrence);
  const duration = daysBetween(startDate, endDate);
  if (!rule || duration <= 0) return null;
  const sample = occurrencesInRange(
    { startDate, endDate, recurrence: { ...rule, ends: { type: "never" } } },
    { start: startDate, end: addDays(startDate, (duration + 1) * 4 + 400) },
  );
  const overlapping = sample.some(
    (occurrence, position) =>
      position > 0 && occurrence.start <= sample[position - 1].end,
  );
  return overlapping
    ? "This repeats more often than the date range lasts. Shorten the range or repeat less often."
    : null;
}

export type RecurrencePreset =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "weekdays"
  | "custom";

const baseRule = (
  frequency: CalendarRecurrenceFrequency,
  weekdays: number[] = [],
): CalendarRecurrence => ({
  frequency,
  interval: 1,
  weekdays,
  monthlyMode: frequency === "monthly" ? "weekday" : "date",
  ends: { type: "never" },
});

export function presetRecurrence(
  preset: RecurrencePreset,
  startDate: string,
): CalendarRecurrence | null {
  if (preset === "daily") return baseRule("daily");
  if (preset === "weekly") return baseRule("weekly", [weekdayOf(startDate)]);
  if (preset === "monthly") return baseRule("monthly");
  if (preset === "yearly") return baseRule("yearly");
  if (preset === "weekdays") return baseRule("weekly", WEEKDAY_SET);
  return null;
}

/** The preset a rule reads as, so a saved rule reopens on the option that made it. */
export function recurrencePreset(
  recurrence: CalendarRecurrence | null,
  startDate: string,
): RecurrencePreset {
  if (!recurrence) return "none";
  const named: RecurrencePreset[] = ["daily", "weekly", "monthly", "yearly", "weekdays"];
  return (
    named.find((preset) =>
      recurrenceEquals(recurrence, presetRecurrence(preset, startDate)),
    ) ?? "custom"
  );
}

export function recurrencePresetOptions(startDate: string) {
  const weekday = WEEKDAY_NAMES[weekdayOf(startDate)];
  const ordinal = ORDINAL_NAMES[weekdayOrdinal(startDate) - 1];
  return [
    { label: "Does not repeat", value: "none" },
    { label: "Daily", value: "daily" },
    { label: `Weekly on ${weekday}`, value: "weekly" },
    { label: `Monthly on the ${ordinal} ${weekday}`, value: "monthly" },
    { label: `Annually on ${dateFormatter.format(utc(startDate))}`, value: "yearly" },
    { label: "Every weekday (Monday to Friday)", value: "weekdays" },
    { label: "Custom…", value: "custom" },
  ] satisfies { label: string; value: RecurrencePreset }[];
}

const weekdayList = (weekdays: number[]) => {
  const names = sortedWeekdays(weekdays).map((day) => WEEKDAY_NAMES[day]);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
};

const every = (interval: number, unit: string) =>
  interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;

/** A compact label for a calendar tile, where the dates already show the rhythm. */
export function recurrenceShortLabel(recurrence: CalendarRecurrence | null) {
  if (!recurrence) return undefined;
  if (recurrence.frequency === "weekly" && isWeekdaySet(recurrence.weekdays))
    return recurrence.interval === 1 ? "Every weekday" : every(recurrence.interval, "week");
  return every(
    recurrence.interval,
    recurrence.frequency === "daily"
      ? "day"
      : recurrence.frequency === "weekly"
        ? "week"
        : recurrence.frequency === "monthly"
          ? "month"
          : "year",
  );
}

/** The full sentence shown in the editor so an author can read the rule back. */
export function recurrenceSummary(
  recurrence: CalendarRecurrence | null,
  startDate: string,
) {
  if (!recurrence) return "Happens once.";
  const { frequency, interval, weekdays, monthlyMode, ends } = recurrence;
  let sentence: string;
  if (frequency === "daily") sentence = every(interval, "day");
  else if (frequency === "weekly")
    sentence =
      isWeekdaySet(weekdays) && interval === 1
        ? "Every weekday (Monday to Friday)"
        : `${every(interval, "week")} on ${weekdayList(weekdays)}`;
  else if (frequency === "monthly")
    sentence =
      monthlyMode === "weekday"
        ? `${every(interval, "month")} on the ${ORDINAL_NAMES[weekdayOrdinal(startDate) - 1]} ${WEEKDAY_NAMES[weekdayOf(startDate)]}`
        : `${every(interval, "month")} on day ${partsOf(startDate).day}`;
  else sentence = `${every(interval, "year")} on ${dateFormatter.format(utc(startDate))}`;
  if (ends.type === "on")
    return `${sentence}, until ${shortDateFormatter.format(utc(ends.date))}.`;
  if (ends.type === "after")
    return `${sentence}, ${ends.count} ${ends.count === 1 ? "time" : "times"}.`;
  return `${sentence}.`;
}

/**
 * The rule as an iCalendar RRULE, which is how the published Google copy stays a
 * single repeating event instead of one copy per date.
 */
export function recurrenceRuleString(
  recurrence: CalendarRecurrence | null,
  startDate: string,
  allDay: boolean,
) {
  if (!recurrence) return null;
  const parts = [`FREQ=${recurrence.frequency.replace("ly", "").toUpperCase()}LY`];
  if (recurrence.interval > 1) parts.push(`INTERVAL=${recurrence.interval}`);
  if (recurrence.frequency === "weekly")
    parts.push(
      `BYDAY=${sortedWeekdays(recurrence.weekdays).map((day) => WEEKDAY_CODES[day]).join(",")}`,
    );
  if (recurrence.frequency === "monthly")
    parts.push(
      recurrence.monthlyMode === "weekday"
        ? `BYDAY=${weekdayOrdinal(startDate) === 5 ? "-1" : weekdayOrdinal(startDate)}${WEEKDAY_CODES[weekdayOf(startDate)]}`
        : `BYMONTHDAY=${partsOf(startDate).day}`,
    );
  if (recurrence.frequency === "yearly") {
    const { month, day } = partsOf(startDate);
    parts.push(`BYMONTH=${month + 1}`, `BYMONTHDAY=${day}`);
  }
  if (recurrence.ends.type === "on") {
    const until = recurrence.ends.date.replace(/-/g, "");
    // An all-day series ends on a date; a timed one is compared as an instant,
    // and the workspace zone is behind UTC, so the last local day is still
    // included by taking the end of that UTC day.
    parts.push(`UNTIL=${allDay ? until : `${until}T235959Z`}`);
  }
  if (recurrence.ends.type === "after") parts.push(`COUNT=${recurrence.ends.count}`);
  return `RRULE:${parts.join(";")}`;
}

/** The two readings of a monthly repeat, named from the date it starts on. */
export function monthlyModeOptions(startDate: string) {
  return [
    { label: `Day ${partsOf(startDate).day} of the month`, value: "date" },
    {
      label: `The ${ORDINAL_NAMES[weekdayOrdinal(startDate) - 1]} ${WEEKDAY_NAMES[weekdayOf(startDate)]}`,
      value: "weekday",
    },
  ] satisfies { label: string; value: CalendarRecurrence["monthlyMode"] }[];
}

/**
 * A starting point for "ends on", far enough out that the author is choosing
 * between real dates instead of correcting an end that is already behind them.
 */
export function suggestedRecurrenceEnd(
  recurrence: CalendarRecurrence,
  startDate: string,
) {
  const occurrences = occurrencesInRange(
    {
      startDate,
      endDate: startDate,
      recurrence: { ...recurrence, ends: { type: "after", count: 14 } },
    },
    { start: startDate, end: addDays(startDate, 366 * 15) },
  );
  return occurrences[occurrences.length - 1]?.start ?? startDate;
}
