import { describe, expect, it } from "vitest";
import { taskActivityLabel, taskStatusChange } from "@/lib/task-activity";
import type { Status } from "@/lib/task-types";
import type { TaskActivity } from "@/lib/activity-types";

const statuses = [
  { id: "todo", name: "To do" },
  { id: "done", name: "Done" },
] as Status[];

describe("task activity", () => {
  it("resolves status changes from activity details", () => {
    const activity = {
      id: "activity",
      task_id: "task",
      actor_id: null,
      action: "moved task",
      details: { from_status_id: "todo", status_id: "done" },
      created_at: "2026-08-13T00:00:00.000Z",
    } satisfies TaskActivity;
    expect(taskStatusChange(activity, statuses)).toEqual({
      from: statuses[0],
      to: statuses[1],
    });
  });

  it("normalizes common activity labels", () => {
    expect(taskActivityLabel("created the task")).toBe("Task created");
    expect(taskActivityLabel("added checklist item Buy snacks")).toBe(
      "Checklist item added Buy snacks",
    );
    expect(taskActivityLabel("attached brief.pdf")).toBe(
      "Attachment added: brief.pdf",
    );
    expect(taskActivityLabel("changed priority")).toBe("Changed priority");
  });
});
