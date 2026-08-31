import { describe, expect, it } from "vitest";
import { withRecordedRows } from "@/lib/activity/activity-state";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";

const workspace = (overrides: Partial<WorkspaceData> = {}): WorkspaceData =>
  ({
    activity: [],
    comments: [],
    ...overrides,
  }) as unknown as WorkspaceData;

const activity = (id: string) =>
  ({ id, task_id: "task-1", action: "added a comment" }) as never;
const comment = (id: string, body = "Declined") =>
  ({ id, task_id: "task-1", body }) as never;

describe("recorded workspace rows", () => {
  it("puts a new audit row at the top of the activity list", () => {
    const data = withRecordedRows(
      { activity: activity("activity-2") },
      workspace({ activity: [activity("activity-1")] }),
    );

    expect(data.activity.map((item) => item.id)).toEqual([
      "activity-2",
      "activity-1",
    ]);
  });

  it("replaces a row the realtime channel already delivered", () => {
    const data = withRecordedRows(
      { activity: activity("activity-1") },
      workspace({ activity: [activity("activity-1")] }),
    );

    expect(data.activity).toHaveLength(1);
  });

  it("appends a status reason to the conversation", () => {
    const data = withRecordedRows(
      { comment: comment("comment-2") },
      workspace({ comments: [comment("comment-1", "Earlier")] }),
    );

    expect(data.comments.map((item) => item.id)).toEqual([
      "comment-1",
      "comment-2",
    ]);
  });

  it("leaves the workspace alone when a write recorded nothing", () => {
    const current = workspace({ activity: [activity("activity-1")] });
    const data = withRecordedRows({ activity: null, comment: null }, current);

    expect(data.activity).toBe(current.activity);
    expect(data.comments).toBe(current.comments);
  });
});
