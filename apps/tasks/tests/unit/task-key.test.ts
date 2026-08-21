import { describe, expect, it } from "vitest";
import { parseTaskKey, taskKey, taskPath } from "@/lib/tasks/task-key";

describe("task keys", () => {
  it("formats task keys and share paths", () => {
    expect(taskKey({ task_number: 123 })).toBe("RMT-123");
    expect(taskPath({ task_number: 123 })).toBe("/task/RMT-123");
  });

  it("parses keys case-insensitively", () => {
    expect(parseTaskKey("RMT-123")).toBe(123);
    expect(parseTaskKey("rmt-123")).toBe(123);
  });

  it("rejects malformed or invalid keys", () => {
    expect(parseTaskKey("RMT-0")).toBeNull();
    expect(parseTaskKey("RMT-12x")).toBeNull();
    expect(parseTaskKey("CIE-123")).toBeNull();
  });
});
