import { describe, expect, it } from "vitest";
import {
  categoryVisibilityMode,
  categoryVisibilityPayload,
  eligibleVisibilityGroups,
  isVisibilityIncomplete,
  projectVisibilityPayload,
  visibilityOptions,
  visibilitySummary,
} from "@/lib/access/content-visibility";
import type { AccessGroup } from "@/lib/access/access-types";

const group = (id: string, name: string, global = false): AccessGroup => ({
  id,
  name,
  description: null,
  color: "#000000",
  created_by: "user",
  created_at: "",
  updated_at: "",
  kind: "team",
  hierarchy_rank: null,
  grants_global_content: global,
  calendar_access: false,
});

const names = (...groups: AccessGroup[]) =>
  new Map(groups.map((entry) => [entry.id, entry.name]));

describe("visibility summaries", () => {
  it("names each mode the row can collapse to", () => {
    const empty = new Map<string, string>();
    expect(visibilitySummary("open", [], empty)).toBe("Everyone");
    expect(visibilitySummary("owners", [], empty)).toBe("Project owners only");
    expect(visibilitySummary("managers", [], empty)).toBe(
      "Workspace managers only",
    );
  });

  it("prompts when a restricted resource has nothing selected", () => {
    expect(visibilitySummary("restricted", [], new Map())).toBe(
      "Choose access groups",
    );
  });

  it("lists up to two groups and counts the rest", () => {
    const groupNames = names(
      group("a", "Design"),
      group("b", "Events"),
      group("c", "Ops"),
    );
    expect(visibilitySummary("restricted", ["a"], groupNames)).toBe("Design");
    expect(visibilitySummary("restricted", ["a", "b"], groupNames)).toBe(
      "Design, Events",
    );
    expect(visibilitySummary("restricted", ["a", "b", "c"], groupNames)).toBe(
      "Design, Events +1",
    );
  });

  it("ignores selected groups that no longer exist", () => {
    const groupNames = names(group("a", "Design"));
    expect(visibilitySummary("restricted", ["a", "gone"], groupNames)).toBe(
      "Design",
    );
    expect(visibilitySummary("restricted", ["gone"], groupNames)).toBe(
      "Choose access groups",
    );
  });
});

describe("visibility options", () => {
  it("offers owners-only to projects and managers-only to categories", () => {
    expect(visibilityOptions("project").map((option) => option.value)).toEqual([
      "owners",
      "open",
      "restricted",
    ]);
    expect(visibilityOptions("category").map((option) => option.value)).toEqual([
      "open",
      "managers",
      "restricted",
    ]);
  });
});

describe("category modes", () => {
  it("reads a restricted category with no groups as manager-only", () => {
    expect(categoryVisibilityMode("restricted", [])).toBe("managers");
    expect(categoryVisibilityMode("restricted", ["a"])).toBe("restricted");
    expect(categoryVisibilityMode("open", [])).toBe("open");
    expect(categoryVisibilityMode("open", ["a"])).toBe("open");
  });
});

describe("selectable groups", () => {
  it("drops groups that already reach every project and category", () => {
    const eligible = eligibleVisibilityGroups([
      group("a", "Design"),
      group("staff", "Staff", true),
    ]);
    expect(eligible.map((entry) => entry.id)).toEqual(["a"]);
  });
});

describe("saving a change", () => {
  it("blocks a restricted resource with no groups chosen", () => {
    expect(isVisibilityIncomplete("restricted", [])).toBe(true);
    expect(isVisibilityIncomplete("restricted", ["a"])).toBe(false);
    expect(isVisibilityIncomplete("owners", [])).toBe(false);
  });

  it("sends the project mode and clears groups outside restricted", () => {
    expect(projectVisibilityPayload("p1", "restricted", ["a", "b"])).toEqual({
      projectId: "p1",
      accessMode: "restricted",
      groupIds: ["a", "b"],
    });
    expect(projectVisibilityPayload("p1", "open", ["a"])).toEqual({
      projectId: "p1",
      accessMode: "open",
      groupIds: [],
    });
    expect(projectVisibilityPayload("p1", "owners", ["a"])).toEqual({
      projectId: "p1",
      accessMode: "owners",
      groupIds: [],
    });
  });

  it("stores manager-only categories as restricted with no groups", () => {
    expect(categoryVisibilityPayload("c1", "managers", ["a"])).toEqual({
      categoryId: "c1",
      accessMode: "restricted",
      groupIds: [],
    });
    expect(categoryVisibilityPayload("c1", "restricted", ["a"])).toEqual({
      categoryId: "c1",
      accessMode: "restricted",
      groupIds: ["a"],
    });
    expect(categoryVisibilityPayload("c1", "open", ["a"])).toEqual({
      categoryId: "c1",
      accessMode: "open",
      groupIds: [],
    });
  });
});
