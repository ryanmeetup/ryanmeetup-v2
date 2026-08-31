import { describe, expect, it } from "vitest";
import {
  calendarDayLayout,
  calendarEventDraft,
  moveCalendarMonth,
  rememberPublishedEvent,
} from "@/lib/calendar/calendar-view";
import type {
  CalendarEvent,
  CalendarItem,
} from "@/lib/calendar/calendar-types";

const event: CalendarEvent = {
  id: "event-1",
  kind: "important",
  title: "Launch day",
  description: null,
  starts_at: "2026-08-30T09:30:00",
  ends_at: "2026-08-30T10:30:00",
  all_day: false,
  recurrence: null,
  project_id: "project-1",
  category_id: null,
  profile_id: null,
  created_by: "profile-1",
  created_at: "2026-08-01T12:00:00Z",
  updated_at: "2026-08-01T12:00:00Z",
};

function item(
  id: string,
  source: CalendarItem["source"],
  start = "2026-08-30",
): CalendarItem {
  return {
    id,
    source,
    title: id,
    start,
    end: start,
    allDay: true,
    color: "#000000",
  };
}

describe("calendar view transformations", () => {
  it("moves across year boundaries", () => {
    expect(moveCalendarMonth("2026-01", -1)).toBe("2025-12");
    expect(moveCalendarMonth("2026-12", 1)).toBe("2027-01");
  });

  it("creates an editor draft from a stored event", () => {
    expect(calendarEventDraft(event, true)).toMatchObject({
      id: "event-1",
      description: "",
      startDate: "2026-08-30",
      startTime: "09:30",
      projectId: "project-1",
      syncToGoogle: true,
    });
  });

  it("replaces or removes the locally published Google copy", () => {
    const published = rememberPublishedEvent(
      [
        {
          id: "unrelated",
          title: "Other",
          start: "2026-08-01",
          end: "2026-08-01",
          allDay: true,
        },
      ],
      event,
      true,
    );
    expect(published).toHaveLength(2);
    expect(published[1]).toMatchObject({
      id: "event1",
      title: "Launch day",
      startTime: "09:30",
    });
    expect(rememberPublishedEvent(published, event, false)).toEqual([
      expect.objectContaining({ id: "unrelated" }),
    ]);
  });

  it("gives away entries and a grouped task summary the limited slots first", () => {
    const layout = calendarDayLayout(
      [
        item("google", "google"),
        item("task-1", "task"),
        item("task-2", "task"),
        item("away", "away"),
      ],
      2,
    );
    expect(layout.awayItems.map(({ id }) => id)).toEqual(["away"]);
    expect(layout.taskItems.map(({ id }) => id)).toEqual(["task-1", "task-2"]);
    expect(layout.otherItems).toEqual([]);
    expect(layout.hiddenCount).toBe(1);
  });
});
