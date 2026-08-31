import { describe, expect, it } from "vitest";
import { taskDraftValidationMessage } from "@/lib/tasks/task-draft-validation";
import { statusNeedingReason } from "@/lib/tasks/task-status-reason";
import type { TaskDraft } from "@/lib/tasks/task-mutations";
import type { Status } from "@/lib/tasks/task-types";

const statuses = [
  { id: "todo", name: "Todo", requires_reason: false },
  { id: "declined", name: "Will Not Do", requires_reason: true },
] as unknown as Status[];

const draft = {
  title: "Second stage lighting",
  status_id: "declined",
  priority: "medium",
  category_ids: ["events"],
  category_tags: {},
  status_reason: "",
} as unknown as TaskDraft;

describe("statusNeedingReason", () => {
  it("asks for a reason when a task enters the status", () => {
    expect(statusNeedingReason(statuses, "declined", "todo")).toMatchObject({
      name: "Will Not Do",
    });
    expect(statusNeedingReason(statuses, "declined", null)).toMatchObject({
      name: "Will Not Do",
    });
  });

  it("does not ask again while the task stays in the status", () => {
    expect(statusNeedingReason(statuses, "declined", "declined")).toBeNull();
  });

  it("leaves statuses that do not require one alone", () => {
    expect(statusNeedingReason(statuses, "todo", "declined")).toBeNull();
  });
});

describe("taskDraftValidationMessage", () => {
  it("blocks a save that declines work without saying why", () => {
    expect(
      taskDraftValidationMessage(draft, { statuses, currentStatusId: "todo" }),
    ).toBe("Add a reason before moving this task to Will Not Do.");
  });

  it("accepts the save once a reason is written", () => {
    expect(
      taskDraftValidationMessage(
        { ...draft, status_reason: "  Sponsor pulled out.  " },
        { statuses, currentStatusId: "todo" },
      ),
    ).toBeNull();
  });

  it("does not demand a reason when only other fields changed", () => {
    expect(
      taskDraftValidationMessage(draft, {
        statuses,
        currentStatusId: "declined",
      }),
    ).toBeNull();
  });

  it("reports the missing title before the missing reason", () => {
    expect(
      taskDraftValidationMessage(
        { ...draft, title: "  " },
        { statuses, currentStatusId: "todo" },
      ),
    ).toBe("A task title is required.");
  });
});
