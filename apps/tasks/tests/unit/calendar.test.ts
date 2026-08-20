import { describe, expect, it } from "vitest";
import {
  calendarItems,
  itemsOnDate,
  monthBounds,
  type CalendarEvent,
} from "@/lib/calendar-types";
import type { Task } from "@/lib/task-types";
import { calendarEventSchema } from "@/lib/api-schema/calendar";

const task = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  task_number: 12,
  title: "Book the venue",
  description: null,
  status_id: "todo",
  project_id: null,
  assignee_id: null,
  created_by: "ryan",
  reported_by: "ryan",
  start_date: null,
  due_date: "2026-08-24",
  due_time: null,
  reminder_at: null,
  priority: "high",
  board_position: 1024,
  completed_at: null,
  archived_at: null,
  created_at: "2026-08-20T12:00:00Z",
  updated_at: "2026-08-20T12:00:00Z",
  ...overrides,
});

const away: CalendarEvent = {
  id: "away-1",
  kind: "away",
  title: "Ryan is away",
  description: null,
  starts_at: "2026-08-27T00:00:00",
  ends_at: "2026-08-30T23:59:00",
  all_day: true,
  project_id: null,
  category_id: null,
  profile_id: "ryan",
  created_by: "ryan",
  created_at: "2026-08-20T12:00:00Z",
  updated_at: "2026-08-20T12:00:00Z",
};

describe("calendar view models", () => {
  it("requires an explicit teammate for time away", () => {
    const draft = {
      kind: "away",
      title: "Out of office",
      description: "",
      startDate: "2026-08-27",
      endDate: "2026-08-30",
      allDay: true,
      startTime: "09:00",
      endTime: "17:00",
      projectId: "",
      categoryId: "",
      profileId: "",
    };
    expect(calendarEventSchema(draft)).toBeNull();
    expect(
      calendarEventSchema({
        ...draft,
        profileId: "4ca54e7a-19ee-4ee6-adc6-c54310a0ce51",
      }),
    ).toMatchObject({
      kind: "away",
      profileId: "4ca54e7a-19ee-4ee6-adc6-c54310a0ce51",
    });
  });

  it("creates task deadlines and hides completed or archived tasks", () => {
    const items = calendarItems(
      [task(), task({ id: "done", completed_at: "2026-08-21T12:00:00Z" })],
      [away],
      [],
      [],
    );
    expect(items.map((item) => item.source)).toEqual(["task", "away"]);
    expect(items[0].href).toBe("/task/RMT-12");
  });

  it("includes a multi-day away entry on every date in its range", () => {
    const items = calendarItems([], [away], [], [], [{
      id: "ryan",
      full_name: "Ryan Smith",
      avatar_url: null,
      onboarding_completed: true,
      task_details_open_by_default: false,
    }]);
    expect(itemsOnDate(items, "2026-08-28")).toHaveLength(1);
    expect(itemsOnDate(items, "2026-08-31")).toHaveLength(0);
    expect(items[0].meta).toBe("Ryan Smith · Away");
  });

  it("builds a six-week Sunday-first month grid", () => {
    const bounds = monthBounds("2026-08");
    expect(bounds.days).toHaveLength(42);
    expect(bounds.days[0]).toBe("2026-07-26");
    expect(bounds.days[41]).toBe("2026-09-05");
  });
});
