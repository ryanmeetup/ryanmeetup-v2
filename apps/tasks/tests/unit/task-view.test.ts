import { describe, expect, it } from "vitest";
import {
  indexTaskAssignees,
  indexTaskCategories,
  taskHasAssignee,
  taskMatchesDueFilter,
} from "@/lib/tasks/task-view";
import type { TaskAssignee, TaskCategory } from "@/lib/tasks/task-types";

describe("task board relation selectors", () => {
  it("indexes every category without duplicating relations", () => {
    const rows = [
      { task_id: "task", category_id: "one" },
      { task_id: "task", category_id: "two" },
      { task_id: "task", category_id: "one" },
    ] as TaskCategory[];
    expect([...indexTaskCategories(rows).get("task")!]).toEqual(["one", "two"]);
  });

  it("indexes every assignee without duplicating relations", () => {
    const rows = [
      { task_id: "task", profile_id: "primary" },
      { task_id: "task", profile_id: "secondary" },
      { task_id: "task", profile_id: "primary" },
    ] as TaskAssignee[];
    expect([...indexTaskAssignees(rows).get("task")!]).toEqual([
      "primary",
      "secondary",
    ]);
  });

  it("matches any assignee on a shared task and recognizes unassigned tasks", () => {
    const assignees = indexTaskAssignees([
      { task_id: "shared", profile_id: "primary" },
      { task_id: "shared", profile_id: "secondary" },
    ]);
    expect(taskHasAssignee(assignees, "shared", "secondary")).toBe(true);
    expect(taskHasAssignee(assignees, "shared", "unassigned")).toBe(false);
    expect(taskHasAssignee(assignees, "empty", "unassigned")).toBe(true);
  });

  it("distinguishes overdue dates from upcoming date windows", () => {
    const clock = new Date("2026-09-05T12:00:00Z").getTime();
    expect(
      taskMatchesDueFilter({ due_date: "2026-09-04" }, "overdue", clock),
    ).toBe(true);
    expect(
      taskMatchesDueFilter({ due_date: "2026-09-05" }, "overdue", clock),
    ).toBe(false);
    expect(taskMatchesDueFilter({ due_date: "2026-09-10" }, "14", clock)).toBe(
      true,
    );
  });
});
