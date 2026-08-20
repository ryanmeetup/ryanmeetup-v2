import { describe, expect, it } from "vitest";
import { taskCommentSegments } from "@/lib/task-comment-references";
import type { TaskReference } from "@/lib/task-types";

const tasks = [
  { id: "task-123", task_number: 123, project_id: null },
  { id: "task-456", task_number: 456, project_id: "project-1" },
] satisfies TaskReference[];

describe("task comment references", () => {
  it("identifies existing ticket references while preserving comment text", () => {
    expect(
      taskCommentSegments("Blocked by RMT-123 and rmt-456.", tasks),
    ).toEqual([
      { kind: "text", value: "Blocked by " },
      { kind: "task", task: tasks[0], value: "RMT-123" },
      { kind: "text", value: " and " },
      { kind: "task", task: tasks[1], value: "rmt-456" },
      { kind: "text", value: "." },
    ]);
  });

  it("leaves missing and malformed ticket references as plain text", () => {
    const body = "Try RMT-999, XRMT-123, and RMT-123abc.";
    expect(taskCommentSegments(body, tasks)).toEqual([
      { kind: "text", value: body },
    ]);
  });
});
