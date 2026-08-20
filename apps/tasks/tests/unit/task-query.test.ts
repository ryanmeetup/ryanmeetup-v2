import { describe, expect, it } from "vitest";
import {
  buildTaskQueryParams,
  taskQuerySignature,
  type TaskQueryFilters,
} from "@/lib/task-query";

const filters: TaskQueryFilters = {
  statuses: ["todo"],
  excludedStatuses: [],
  projects: [],
  excludedProjects: [],
  assignees: ["person"],
  excludedAssignees: [],
  reporters: [],
  excludedReporters: [],
  categories: ["category"],
  excludedCategories: [],
  priorities: ["high"],
  excludedPriorities: [],
  dueWithin: ["7"],
  excludedDueWithin: [],
  tags: [{ categoryId: "category", tag: "Launch" }],
  excludedTags: [],
};

describe("task query", () => {
  it("serializes list filters and pagination", () => {
    const params = buildTaskQueryParams({
      filters,
      page: 2,
      pageSize: 25,
      search: " launch ",
      sort: "due",
      view: "list",
      visibility: "active",
    });
    expect(params.get("page")).toBe("2");
    expect(params.get("status")).toBe("todo");
    expect(params.get("priority")).toBe("high");
    expect(params.get("search")).toBe("launch");
    expect(params.get("tags")).toBe("category~Launch");
  });

  it("keeps board queries compact", () => {
    const params = buildTaskQueryParams({
      filters,
      page: 2,
      pageSize: 25,
      search: "launch",
      sort: "due",
      view: "board",
      visibility: "archived",
    });
    expect(params.toString()).toBe("visibility=archived");
    expect(
      taskQuerySignature({
        filters,
        pageSize: 25,
        search: "",
        sort: "updated",
        view: "board",
        visibility: "active",
      }),
    ).toBe("board|active");
  });
});
