import { describe, expect, it } from "vitest";
import {
  resolveDueFilterValues,
  resolveEntityFilterIds,
  resolvePriorityFilterValues,
  splitTaskFilterValues,
} from "@/lib/tasks/task-filter-values";

describe("task filter values", () => {
  it("normalizes empty and all selections", () => {
    expect(splitTaskFilterValues("all")).toEqual([]);
    expect(splitTaskFilterValues("a,b")).toEqual(["a", "b"]);
  });

  it("resolves readable entity names to ids", () => {
    const items = [{ id: "one", name: "Project One" }];
    expect(resolveEntityFilterIds("Project One", items)).toEqual(["one"]);
    expect(resolveEntityFilterIds("none", items, true)).toEqual(["none"]);
  });

  it("accepts only supported priority and due values", () => {
    expect(resolvePriorityFilterValues("HIGH,nope,urgent")).toEqual([
      "high",
      "urgent",
    ]);
    expect(resolveDueFilterValues("overdue,7,90,30")).toEqual([
      "overdue",
      "7",
      "30",
    ]);
  });
});
