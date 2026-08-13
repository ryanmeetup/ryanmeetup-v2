import { describe, expect, it } from "vitest";
import { normalizeTaskSchedule, withNormalizedTaskSchedule } from "@/lib/task-scheduling";

describe("task scheduling normalization", () => {
  it("trims dates, canonicalizes times, and converts reminders to ISO", () => {
    expect(normalizeTaskSchedule({
      start_date: " 2026-08-13 ", due_date: "2026-08-14", due_time: "09:30:45",
      reminder_at: "2026-08-14T09:00:00-04:00",
    })).toEqual({
      start_date: "2026-08-13", due_date: "2026-08-14", due_time: "09:30",
      reminder_at: "2026-08-14T13:00:00.000Z",
    });
  });

  it("rejects impossible combinations and reversed ranges", () => {
    expect(normalizeTaskSchedule({ due_time: "09:30" })).toBeNull();
    expect(normalizeTaskSchedule({ start_date: "2026-08-15", due_date: "2026-08-14" })).toBeNull();
    expect(normalizeTaskSchedule({ due_date: "08/14/2026" })).toBeNull();
    expect(() => withNormalizedTaskSchedule({ due_date: "bad" })).toThrow("schedule is invalid");
  });
});
