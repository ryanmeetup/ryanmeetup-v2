import { describe, expect, it } from "vitest";
import { indexTaskAssignees, indexTaskCategories } from "@/lib/tasks/task-view";
import type { Task, TaskAssignee, TaskCategory } from "@/lib/tasks/task-types";

describe("task board relation selectors", () => {
  it("indexes every category without duplicating relations", () => {
    const rows = [
      { task_id: "task", category_id: "one" },
      { task_id: "task", category_id: "two" },
      { task_id: "task", category_id: "one" },
    ] as TaskCategory[];
    expect([...indexTaskCategories(rows).get("task")!]).toEqual(["one", "two"]);
  });

  it("merges legacy primary assignees with relation rows", () => {
    const tasks = [{ id: "task", assignee_id: "primary" }] as Task[];
    const rows = [
      { task_id: "task", profile_id: "secondary" },
    ] as TaskAssignee[];
    expect([...indexTaskAssignees(tasks, rows).get("task")!]).toEqual([
      "primary",
      "secondary",
    ]);
  });
});
