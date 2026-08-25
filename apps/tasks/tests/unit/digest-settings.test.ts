import { describe, expect, it } from "vitest";
import {
  describeCadence,
  digestDefaults,
  isDigestSlot,
  nextDigestRun,
  normalizeSections,
  normalizeWeekdays,
  resolveDigestSettings,
  type DigestSettings,
} from "@/lib/digest/digest-settings";
import { buildTaskDigest, type DigestTask } from "@/lib/tasks/task-digest";
import { digestSettingsSchema } from "@/lib/api-schema";

const settings = (overrides: Partial<DigestSettings> = {}): DigestSettings => ({
  ...digestDefaults,
  sections: [...digestDefaults.sections],
  ...overrides,
});

const task = (
  values: Partial<DigestTask> &
    Pick<DigestTask, "id" | "task_number" | "title">,
): DigestTask => ({
  due_date: null,
  due_time: null,
  description: null,
  priority: "medium",
  updated_at: "2026-08-01T12:00:00.000Z",
  ...values,
});

describe("digest cadence", () => {
  it("sends only in the configured hour, on configured days, in the configured zone", () => {
    const weekdayNine = settings();
    // 13:00 UTC is 09:00 in New York during daylight time.
    expect(
      isDigestSlot(weekdayNine, new Date("2026-08-25T13:00:00.000Z")),
    ).toBe(true);
    expect(
      isDigestSlot(weekdayNine, new Date("2026-08-25T14:00:00.000Z")),
    ).toBe(false);
    // 2026-08-23 is a Sunday, which is not in the default weekday set.
    expect(
      isDigestSlot(weekdayNine, new Date("2026-08-23T13:00:00.000Z")),
    ).toBe(false);
  });

  it("treats the whole hour as the slot, so a late or retried run still matches", () => {
    expect(isDigestSlot(settings(), new Date("2026-08-25T13:59:00.000Z"))).toBe(
      true,
    );
  });

  it("follows the workspace zone rather than UTC", () => {
    const london = settings({ timeZone: "Europe/London" });
    expect(isDigestSlot(london, new Date("2026-08-25T08:00:00.000Z"))).toBe(
      true,
    );
    expect(isDigestSlot(london, new Date("2026-08-25T13:00:00.000Z"))).toBe(
      false,
    );
  });

  it("never sends while paused", () => {
    expect(
      isDigestSlot(settings({ enabled: false }), new Date("2026-08-25T13:00:00.000Z")),
    ).toBe(false);
  });

  it("reports the next slot, and none at all when paused", () => {
    const next = nextDigestRun(
      settings(),
      new Date("2026-08-25T20:00:00.000Z"),
    );
    // Tuesday evening: the next weekday 09:00 New York is Wednesday.
    expect(next?.toISOString()).toBe("2026-08-26T13:00:00.000Z");
    expect(nextDigestRun(settings({ enabled: false }), new Date())).toBeNull();
  });

  it("skips the weekend when looking ahead", () => {
    const next = nextDigestRun(
      settings(),
      new Date("2026-08-21T20:00:00.000Z"),
    );
    expect(next?.toISOString()).toBe("2026-08-24T13:00:00.000Z");
  });

  it("reports a strictly future slot, not the one already under way", () => {
    // 13:30 UTC is half an hour into the 09:00 New York slot: that run has
    // already begun, so the next one is tomorrow.
    expect(
      nextDigestRun(settings(), new Date("2026-08-25T13:30:00.000Z"))
        ?.toISOString(),
    ).toBe("2026-08-26T13:00:00.000Z");
    // Exactly on the hour, the slot starting now is the answer.
    expect(
      nextDigestRun(settings(), new Date("2026-08-25T13:00:00.000Z"))
        ?.toISOString(),
    ).toBe("2026-08-25T13:00:00.000Z");
  });

  it("summarizes the cadence for the settings card", () => {
    expect(describeCadence(settings())).toContain("Mon–Fri");
    expect(describeCadence(settings({ weekdays: [0, 1, 2, 3, 4, 5, 6] }))).toContain(
      "every day",
    );
    expect(describeCadence(settings({ enabled: false }))).toBe("Paused");
  });
});

describe("digest settings resolution", () => {
  it("falls back per field rather than discarding a partial row", () => {
    const resolved = resolveDigestSettings({
      send_hour: 30,
      time_zone: "Not/AZone",
      weekdays: [1, 9, 2],
      sections: ["overdue", "nope"],
      review_minutes: 45,
    });
    expect(resolved.sendHour).toBe(digestDefaults.sendHour);
    expect(resolved.timeZone).toBe(digestDefaults.timeZone);
    expect(resolved.weekdays).toEqual([1, 2]);
    expect(resolved.sections).toEqual(["overdue"]);
    expect(resolved.reviewMinutes).toBe(45);
  });

  it("keeps the built-in defaults when the table has no row yet", () => {
    expect(resolveDigestSettings(null)).toEqual(digestDefaults);
  });

  it("refuses to leave a workspace with no days or no sections", () => {
    expect(normalizeWeekdays([])).toEqual(digestDefaults.weekdays);
    expect(normalizeSections(["not-a-section"])).toEqual(
      digestDefaults.sections,
    );
  });
});

describe("digest structure", () => {
  const sample = [
    task({ id: "1", task_number: 1, title: "Late", due_date: "2026-08-19" }),
    task({ id: "2", task_number: 2, title: "Today", due_date: "2026-08-20" }),
    task({ id: "3", task_number: 3, title: "Soon", due_date: "2026-08-23" }),
  ];
  const now = new Date("2026-08-20T12:00:00.000Z");

  it("renders sections in the configured order", () => {
    const digest = buildTaskDigest(
      sample,
      "2026-08-20",
      settings({ sections: ["dueToday", "overdue"] }),
      now,
    );
    expect(digest.map((section) => section.key)).toEqual([
      "dueToday",
      "overdue",
    ]);
  });

  it("omits disabled sections entirely", () => {
    const digest = buildTaskDigest(
      sample,
      "2026-08-20",
      settings({ sections: ["overdue"] }),
      now,
    );
    expect(digest.map((section) => section.key)).toEqual(["overdue"]);
    expect(taskIds(digest)).toEqual(["1"]);
  });

  it("honours the configured upcoming window", () => {
    const narrow = buildTaskDigest(
      sample,
      "2026-08-20",
      settings({ sections: ["upcoming"], upcomingDays: 1 }),
      now,
    );
    expect(narrow).toHaveLength(0);
    const wide = buildTaskDigest(
      sample,
      "2026-08-20",
      settings({ sections: ["upcoming"], upcomingDays: 5 }),
      now,
    );
    expect(taskIds(wide)).toEqual(["3"]);
  });

  it("honours the configured recent window", () => {
    const changed = [
      task({
        id: "9",
        task_number: 9,
        title: "Touched a week ago",
        updated_at: "2026-08-13T12:00:00.000Z",
      }),
    ];
    expect(
      buildTaskDigest(
        changed,
        "2026-08-20",
        settings({ sections: ["recentlyUpdated"], recentDays: 3 }),
        now,
      ),
    ).toHaveLength(0);
    expect(
      buildTaskDigest(
        changed,
        "2026-08-20",
        settings({ sections: ["recentlyUpdated"], recentDays: 14 }),
        now,
      ),
    ).toHaveLength(1);
  });
});

const taskIds = (digest: ReturnType<typeof buildTaskDigest>) =>
  digest.flatMap((section) => section.tasks.map((item) => item.id));

describe("digest settings schema", () => {
  it("accepts a partial, in-range update", () => {
    expect(
      digestSettingsSchema({ sendHour: 7, weekdays: [5, 1], enabled: false }),
    ).toEqual({ sendHour: 7, weekdays: [1, 5], enabled: false });
  });

  it("preserves section order, because it is the render order", () => {
    expect(
      digestSettingsSchema({ sections: ["dueToday", "overdue"] }),
    ).toEqual({ sections: ["dueToday", "overdue"] });
  });

  it("rejects out-of-range, unknown, duplicated, and empty values", () => {
    expect(digestSettingsSchema({ sendHour: 24 })).toBeNull();
    expect(digestSettingsSchema({ reviewMinutes: 4 })).toBeNull();
    expect(digestSettingsSchema({ maxRecipients: 91 })).toBeNull();
    expect(digestSettingsSchema({ weekdays: [] })).toBeNull();
    expect(digestSettingsSchema({ weekdays: [1, 1] })).toBeNull();
    expect(digestSettingsSchema({ sections: ["overdue", "overdue"] })).toBeNull();
    expect(digestSettingsSchema({ sections: ["invented"] })).toBeNull();
    expect(digestSettingsSchema({ timeZone: "Not/AZone" })).toBeNull();
    expect(digestSettingsSchema({ unknownField: 1 })).toBeNull();
    expect(digestSettingsSchema({})).toBeNull();
  });

  it("rejects null, since digest settings have no inherit tier", () => {
    expect(digestSettingsSchema({ sendHour: null })).toBeNull();
  });
});
