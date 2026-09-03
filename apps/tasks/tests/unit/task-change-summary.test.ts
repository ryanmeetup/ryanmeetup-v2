import { describe, expect, it } from "vitest";
import {
  parseTaskChanges,
  summarizeTaskChanges,
  taskChangeSnapshot,
  type TaskChangeSnapshot,
} from "@/lib/activity/task-change-summary";

const snapshot = (
  overrides: Partial<TaskChangeSnapshot> = {},
): TaskChangeSnapshot =>
  taskChangeSnapshot({
    title: "Book the venue",
    description: "Call around",
    status_id: "todo",
    project_id: null,
    assignee_ids: [],
    reported_by: "ryan",
    start_date: null,
    due_date: null,
    due_time: null,
    reminder_at: null,
    priority: "medium",
    category_ids: ["events"],
    category_tags: {},
    ...overrides,
  });

describe("task change summary", () => {
  it("reports no changes when a save keeps every field", () => {
    expect(summarizeTaskChanges(snapshot(), snapshot())).toEqual([]);
  });

  it("names each changed scalar field with its before and after value", () => {
    const changes = summarizeTaskChanges(
      snapshot(),
      snapshot({
        status_id: "doing",
        assignee_ids: ["sam", "alex"],
        due_date: "2026-09-01",
      }),
    );
    expect(changes).toEqual([
      { field: "status", from: "todo", to: "doing" },
      { field: "assignee", added: ["alex", "sam"], removed: [] },
      { field: "due_date", from: null, to: "2026-09-01" },
    ]);
  });

  it("orders changes for reading rather than by comparison order", () => {
    const changes = summarizeTaskChanges(
      snapshot(),
      snapshot({
        due_date: "2026-09-01",
        title: "Book the hall",
        priority: "urgent",
      }),
    );
    expect(changes.map((change) => change.field)).toEqual([
      "title",
      "priority",
      "due_date",
    ]);
  });

  it("records a description edit without copying either body", () => {
    const changes = summarizeTaskChanges(
      snapshot(),
      snapshot({ description: "Called around" }),
    );
    expect(changes).toEqual([{ field: "description" }]);
  });

  it("treats a cleared field and an absent field as the same value", () => {
    expect(
      summarizeTaskChanges(
        snapshot({ description: null }),
        snapshot({ description: "" }),
      ),
    ).toEqual([]);
  });

  it("splits category and tag membership into additions and removals", () => {
    const changes = summarizeTaskChanges(
      snapshot({ category_ids: ["events"], category_tags: { events: ["av"] } }),
      snapshot({
        category_ids: ["ops"],
        category_tags: { ops: ["av", "catering"] },
      }),
    );
    expect(changes).toEqual([
      { field: "categories", added: ["ops"], removed: ["events"] },
      { field: "tags", added: ["catering"], removed: [] },
    ]);
  });

  it("ignores category ordering when comparing membership", () => {
    expect(
      summarizeTaskChanges(
        snapshot({ category_ids: ["events", "ops"] }),
        snapshot({ category_ids: ["ops", "events"] }),
      ),
    ).toEqual([]);
  });

  it("drops stored entries that are not recognizable changes", () => {
    expect(
      parseTaskChanges([
        { field: "status", from: "todo", to: "doing" },
        { field: "not-a-field", to: "x" },
        "status",
        null,
      ]),
    ).toEqual([
      {
        field: "status",
        from: "todo",
        to: "doing",
        added: undefined,
        removed: undefined,
      },
    ]);
    expect(parseTaskChanges(undefined)).toEqual([]);
  });
});
