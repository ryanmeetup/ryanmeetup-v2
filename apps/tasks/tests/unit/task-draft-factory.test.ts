import { describe, expect, it } from "vitest";
import { editTaskDraft } from "@/lib/task-draft-factory";
import type { Task } from "@/lib/task-types";

const task: Task = {
  id: "task-1",
  task_number: 42,
  title: "Original title",
  description: "Keep the details",
  status_id: "status-1",
  project_id: "project-1",
  assignee_id: "assignee-1",
  created_by: "creator-1",
  reported_by: "reporter-1",
  start_date: "2026-08-13",
  due_date: "2026-08-14",
  due_time: "09:30",
  reminder_at: "2026-08-14T13:00:00.000Z",
  priority: "high",
  category_tags: { "category-1": ["Regression"] },
  board_position: 1024,
  completed_at: null,
  archived_at: null,
  created_at: "2026-08-01T12:00:00.000Z",
  updated_at: "2026-08-12T12:00:00.000Z",
};

describe("editTaskDraft", () => {
  it("preserves every untouched editable field when one field changes", () => {
    const originalDraft = editTaskDraft(task, ["category-1"]);
    const changedDraft = { ...originalDraft, title: "Updated title" };

    expect(changedDraft).toEqual({
      ...originalDraft,
      title: "Updated title",
    });
    expect(changedDraft.start_date).toBe(task.start_date);
    expect(changedDraft.due_time).toBe(task.due_time);
  });
});
