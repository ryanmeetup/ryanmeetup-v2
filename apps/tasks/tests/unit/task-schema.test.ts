import { describe, expect, it } from "vitest";
import { taskMoveSchema, taskSaveSchema } from "@/lib/api-schema/task";

const statusId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";
const reporterId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";

const save = (extra: Record<string, unknown>) =>
  taskSaveSchema({
    task: {
      title: "Second stage lighting",
      status_id: statusId,
      reported_by: reporterId,
      priority: "medium",
    },
    assigneeIds: [],
    categoryIds: [categoryId],
    ...extra,
  });

const move = (extra: Record<string, unknown>) =>
  taskMoveSchema({ id: taskId, statusId, boardPosition: 1024, ...extra });

describe("task save schema", () => {
  // The client sends an explicit null for every save into a status that asks
  // for no reason, which is most of them.
  it("accepts a null reason as no reason at all", () => {
    expect(save({ statusReason: null })).toMatchObject({ statusReason: null });
    expect(save({})).toMatchObject({ statusReason: null });
  });

  it("keeps a written reason, trimmed", () => {
    expect(save({ statusReason: "  Sponsor pulled out.  " })).toMatchObject({
      statusReason: "Sponsor pulled out.",
    });
  });

  it("rejects a reason that is not text or is too long", () => {
    expect(save({ statusReason: 42 })).toBeNull();
    expect(save({ statusReason: "x".repeat(2001) })).toBeNull();
  });
});

describe("task move schema", () => {
  it("accepts a null reason as no reason at all", () => {
    expect(move({ statusReason: null })).toMatchObject({ statusReason: null });
    expect(move({})).toMatchObject({ statusReason: null });
  });

  it("keeps a written reason, trimmed", () => {
    expect(move({ statusReason: "  Venue said no.  " })).toMatchObject({
      statusReason: "Venue said no.",
    });
  });

  it("rejects a reason that is not text or is too long", () => {
    expect(move({ statusReason: 42 })).toBeNull();
    expect(move({ statusReason: "x".repeat(2001) })).toBeNull();
  });
});
