import { describe, expect, it } from "vitest";
import { hasDraftAutosaveContent } from "@/lib/task-drafts";
import type { TaskDraft } from "@/lib/task-mutations";

const contextualDraft: TaskDraft = {
  title: "",
  description: "",
  status_id: "todo",
  project_id: "tasks-site",
  assignee_id: null,
  reported_by: "ryan",
  start_date: null,
  due_date: null,
  due_time: null,
  reminder_at: null,
  priority: "medium",
  category_ids: ["engineering"],
  category_tags: {},
};

describe("hasDraftAutosaveContent", () => {
  it("ignores values supplied by the surrounding task context", () => {
    expect(hasDraftAutosaveContent(contextualDraft)).toBe(false);
  });

  it("recognizes user-authored task content", () => {
    expect(
      hasDraftAutosaveContent({
        ...contextualDraft,
        title: "Fix the task modal",
      }),
    ).toBe(true);
    expect(
      hasDraftAutosaveContent({
        ...contextualDraft,
        due_date: "2026-08-10",
      }),
    ).toBe(true);
  });
});
