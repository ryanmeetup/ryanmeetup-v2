import { recurrenceRuleString } from "./calendar-recurrence";
import type { CalendarEvent } from "./calendar-types";

// Calendar times are stored as naive wall-clock values, so Google needs the
// workspace zone spelled out for timed events. It is also the zone imported
// events are read in and the one every displayed time is labelled with.
export const WORKSPACE_TIME_ZONE = "America/New_York";

export type GoogleCalendarEventBody = {
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  // Google expands the series itself, so a repeating date stays one event with
  // one rule instead of a copy per occurrence.
  recurrence?: string[];
};

// Google event IDs accept base32hex characters, so a workspace UUID without its
// dashes is a valid, stable ID for the copy this app owns. Deriving the ID
// keeps the two calendars reconcilable without storing a second identifier.
export function workspaceGoogleEventId(eventId: string) {
  return eventId.replace(/-/g, "").toLowerCase();
}

export function workspaceGoogleEventIds(events: { id: string }[]) {
  return new Set(events.map((event) => workspaceGoogleEventId(event.id)));
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function workspaceGoogleEventBody(
  event: Pick<
    CalendarEvent,
    "title" | "description" | "starts_at" | "ends_at" | "all_day" | "recurrence"
  >,
): GoogleCalendarEventBody {
  const startDate = event.starts_at.slice(0, 10);
  const endDate = event.ends_at.slice(0, 10);
  const summary = event.title;
  const description = event.description ?? undefined;
  const rule = recurrenceRuleString(
    event.recurrence,
    startDate,
    event.all_day,
  );
  // An event that no longer repeats has to send an empty rule list, or Google
  // keeps the series it was published with.
  const recurrence = rule ? [rule] : [];
  if (event.all_day)
    return {
      summary,
      description,
      recurrence,
      start: { date: startDate },
      // Google treats an all-day end date as exclusive.
      end: { date: addDays(endDate, 1) },
    };
  return {
    summary,
    description,
    recurrence,
    start: {
      dateTime: `${startDate}T${event.starts_at.slice(11, 19) || "00:00:00"}`,
      timeZone: WORKSPACE_TIME_ZONE,
    },
    end: {
      dateTime: `${endDate}T${event.ends_at.slice(11, 19) || "23:59:00"}`,
      timeZone: WORKSPACE_TIME_ZONE,
    },
  };
}
