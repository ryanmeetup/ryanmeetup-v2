import { describe, expect, it } from "vitest";
import {
  occurrencesInRange,
  parseRecurrence,
  presetRecurrence,
  recurrencePreset,
  recurrenceSpanConflict,
  recurrenceSummary,
  suggestedRecurrenceEnd,
  type CalendarRecurrence,
} from "@/lib/calendar/calendar-recurrence";
import {
  calendarItems,
  type CalendarEvent,
} from "@/lib/calendar/calendar-types";
import { calendarEventSchema } from "@/lib/api-schema/calendar";

const rule = (overrides: Partial<CalendarRecurrence> = {}): CalendarRecurrence => ({
  frequency: "weekly",
  interval: 1,
  weekdays: [1],
  monthlyMode: "date",
  ends: { type: "never" },
  ...overrides,
});

const starts = (
  entry: { startDate: string; endDate?: string; recurrence: unknown },
  range: { start: string; end: string },
) =>
  occurrencesInRange(
    { endDate: entry.startDate, ...entry },
    range,
  ).map((occurrence) => occurrence.start);

describe("day-scoped recurrence", () => {
  it("repeats a single date on the days the rule selects", () => {
    expect(
      starts(
        { startDate: "2026-09-07", recurrence: rule({ interval: 2, weekdays: [1, 3] }) },
        { start: "2026-09-01", end: "2026-09-30" },
      ),
    ).toEqual(["2026-09-07", "2026-09-09", "2026-09-21", "2026-09-23"]);
  });

  it("keeps a repeat accurate in a range years after it started", () => {
    expect(
      starts(
        { startDate: "2020-01-01", recurrence: rule({ weekdays: [1, 2, 3, 4, 5] }) },
        { start: "2026-08-31", end: "2026-09-04" },
      ),
    ).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
    ]);
  });

  it("stops a capped series at its last occurrence", () => {
    expect(
      starts(
        {
          startDate: "2026-09-07",
          recurrence: rule({ ends: { type: "after", count: 3 } }),
        },
        { start: "2026-09-01", end: "2026-12-31" },
      ),
    ).toEqual(["2026-09-07", "2026-09-14", "2026-09-21"]);
  });

  it("stops a dated series on its last day", () => {
    expect(
      starts(
        {
          startDate: "2026-09-07",
          recurrence: rule({ ends: { type: "on", date: "2026-09-21" } }),
        },
        { start: "2026-09-01", end: "2026-12-31" },
      ),
    ).toEqual(["2026-09-07", "2026-09-14", "2026-09-21"]);
  });

  it("skips a month that has no such day instead of shifting the date", () => {
    expect(
      starts(
        { startDate: "2026-01-31", recurrence: rule({ frequency: "monthly" }) },
        { start: "2026-01-01", end: "2026-06-30" },
      ),
    ).toEqual(["2026-01-31", "2026-03-31", "2026-05-31"]);
  });

  it("follows the weekday position when a month repeat is read that way", () => {
    expect(
      starts(
        {
          startDate: "2026-09-07",
          recurrence: rule({ frequency: "monthly", monthlyMode: "weekday" }),
        },
        { start: "2026-09-01", end: "2026-12-31" },
      ),
    ).toEqual(["2026-09-07", "2026-10-05", "2026-11-02", "2026-12-07"]);
  });

  it("treats a start date in the last week of the month as the last weekday", () => {
    expect(
      starts(
        {
          startDate: "2026-09-28",
          recurrence: rule({ frequency: "monthly", monthlyMode: "weekday" }),
        },
        { start: "2026-09-01", end: "2026-12-31" },
      ),
    ).toEqual(["2026-09-28", "2026-10-26", "2026-11-30", "2026-12-28"]);
  });

  it("skips a leap day in years that do not have one", () => {
    expect(
      starts(
        { startDate: "2028-02-29", recurrence: rule({ frequency: "yearly" }) },
        { start: "2028-01-01", end: "2033-12-31" },
      ),
    ).toEqual(["2028-02-29", "2032-02-29"]);
  });

  it("carries the length of the span into every occurrence", () => {
    expect(
      occurrencesInRange(
        {
          startDate: "2026-09-07",
          endDate: "2026-09-09",
          recurrence: rule({ frequency: "monthly" }),
        },
        { start: "2026-09-01", end: "2026-11-30" },
      ),
    ).toEqual([
      { start: "2026-09-07", end: "2026-09-09" },
      { start: "2026-10-07", end: "2026-10-09" },
      { start: "2026-11-07", end: "2026-11-09" },
    ]);
  });

  it("includes an occurrence that started before the range and runs into it", () => {
    expect(
      occurrencesInRange(
        {
          startDate: "2026-09-01",
          endDate: "2026-09-05",
          recurrence: rule({ frequency: "monthly" }),
        },
        { start: "2026-10-03", end: "2026-10-04" },
      ),
    ).toEqual([{ start: "2026-10-01", end: "2026-10-05" }]);
  });

  it("returns the single span when a date does not repeat", () => {
    expect(
      occurrencesInRange(
        { startDate: "2026-09-07", endDate: "2026-09-08", recurrence: null },
        { start: "2026-09-01", end: "2026-09-30" },
      ),
    ).toEqual([{ start: "2026-09-07", end: "2026-09-08" }]);
  });
});

describe("recurrence rules as input", () => {
  it("rejects a rule it cannot read rather than saving a date that never repeats", () => {
    expect(parseRecurrence({ frequency: "hourly", interval: 1 })).toBeNull();
    expect(parseRecurrence(rule({ interval: 0 }))).toBeNull();
    expect(parseRecurrence(rule({ weekdays: [] }))).toBeNull();
    expect(parseRecurrence({ ...rule(), ends: { type: "after", count: 0 } })).toBeNull();
    expect(parseRecurrence(rule())).toEqual(rule());
  });

  it("refuses a repeat that lands on top of the span it repeats", () => {
    expect(recurrenceSpanConflict("2026-09-07", "2026-09-20", rule())).toBeTruthy();
    expect(recurrenceSpanConflict("2026-09-07", "2026-09-09", rule())).toBeNull();
  });

  const draft = {
    kind: "important",
    title: "Weekly Ryan sync",
    description: "",
    startDate: "2026-09-07",
    endDate: "2026-09-07",
    allDay: true,
    startTime: "09:00",
    endTime: "17:00",
    projectId: "",
    categoryId: "",
    profileId: "",
    syncToGoogle: false,
  };

  it("saves a readable rule and refuses an unreadable one", () => {
    expect(calendarEventSchema({ ...draft, recurrence: rule() })).toMatchObject({
      recurrence: rule(),
    });
    expect(calendarEventSchema({ ...draft, recurrence: null })).toMatchObject({
      recurrence: null,
    });
    expect(
      calendarEventSchema({ ...draft, recurrence: { frequency: "weekly" } }),
    ).toBeNull();
  });

  it("refuses a series that ends before it starts", () => {
    expect(
      calendarEventSchema({
        ...draft,
        recurrence: rule({ ends: { type: "on", date: "2026-09-01" } }),
      }),
    ).toBeNull();
  });

  it("refuses a repeat the span itself outlasts", () => {
    expect(
      calendarEventSchema({
        ...draft,
        endDate: "2026-09-20",
        recurrence: rule(),
      }),
    ).toBeNull();
  });
});

describe("recurrence as an author reads it", () => {
  it("reopens a saved rule on the preset that made it", () => {
    const startDate = "2026-09-07";
    for (const preset of ["daily", "weekly", "monthly", "yearly", "weekdays"] as const)
      expect(recurrencePreset(presetRecurrence(preset, startDate), startDate)).toBe(
        preset,
      );
    expect(recurrencePreset(rule({ interval: 3 }), startDate)).toBe("custom");
    expect(recurrencePreset(null, startDate)).toBe("none");
  });

  it("describes the rule in the words the dropdown used", () => {
    expect(recurrenceSummary(null, "2026-09-07")).toBe("Happens once.");
    expect(recurrenceSummary(rule({ interval: 2, weekdays: [1, 3] }), "2026-09-07")).toBe(
      "Every 2 weeks on Monday and Wednesday.",
    );
    expect(
      recurrenceSummary(rule({ weekdays: [1, 2, 3, 4, 5] }), "2026-09-07"),
    ).toBe("Every weekday (Monday to Friday).");
    expect(
      recurrenceSummary(
        rule({ frequency: "monthly", monthlyMode: "weekday", ends: { type: "on", date: "2026-12-07" } }),
        "2026-09-07",
      ),
    ).toBe("Every month on the first Monday, until Dec 7, 2026.");
    expect(
      recurrenceSummary(rule({ ends: { type: "after", count: 13 } }), "2026-09-07"),
    ).toBe("Every week on Monday, 13 times.");
  });

  it("suggests an end date the series actually reaches", () => {
    expect(suggestedRecurrenceEnd(rule(), "2026-09-07")).toBe("2026-12-07");
  });
});

describe("repeating dates on the calendar", () => {
  const series: CalendarEvent = {
    id: "series-1",
    kind: "important",
    title: "Weekly Ryan sync",
    description: null,
    starts_at: "2026-09-07T00:00:00",
    ends_at: "2026-09-07T23:59:00",
    all_day: true,
    recurrence: rule(),
    project_id: null,
    category_id: null,
    profile_id: null,
    created_by: "ryan",
    created_at: "2026-08-20T12:00:00Z",
    updated_at: "2026-08-20T12:00:00Z",
  };

  it("draws one tile per occurrence inside the range and leaves the rest out", () => {
    const items = calendarItems([], [series], [], [], [], [], {
      start: "2026-09-01",
      end: "2026-09-30",
    });
    expect(items.map((item) => item.id)).toEqual([
      "event:series-1:2026-09-07",
      "event:series-1:2026-09-14",
      "event:series-1:2026-09-21",
      "event:series-1:2026-09-28",
    ]);
    // Every tile edits the one row behind the series.
    expect(items.every((item) => item.event === series)).toBe(true);
    expect(items[0].meta).toBe("Every week");
  });
});
