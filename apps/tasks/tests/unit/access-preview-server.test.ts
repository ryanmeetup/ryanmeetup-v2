import { describe, expect, it } from "vitest";
import {
  accessibleCategoryIdsForPreview,
  grantsCalendarAccessForPreview,
} from "@/lib/server/access-preview";

const categories = [
  { id: "general", access_mode: "open" as const },
  { id: "finance", access_mode: "restricted" as const },
  { id: "events", access_mode: "restricted" as const },
];

describe("access preview category visibility", () => {
  it("keeps a restricted category closed when it has no additional grants", () => {
    expect(
      accessibleCategoryIdsForPreview(categories, [], ["ryan"], false),
    ).toEqual(["general"]);
  });

  it("opens a restricted category only to a specifically granted group", () => {
    const grants = [{ category_id: "events", group_id: "ryan" }];

    expect(
      accessibleCategoryIdsForPreview(categories, grants, ["ryan"], false),
    ).toEqual(["general", "events"]);
  });

  it("allows R Suite and owners to see every category", () => {
    expect(accessibleCategoryIdsForPreview(categories, [], [], true)).toEqual([
      "general",
      "finance",
      "events",
    ]);
  });
});

const groups = [
  { id: "r-suite", calendar_access: true },
  { id: "ryan-leads", calendar_access: false },
  { id: "events-team", calendar_access: null },
];

describe("access preview calendar visibility", () => {
  it("grants the workspace calendar through the group that allows it", () => {
    expect(grantsCalendarAccessForPreview(groups, ["r-suite"])).toBe(true);
  });

  it("inherits calendar access from a lower tier", () => {
    expect(
      grantsCalendarAccessForPreview(groups, ["ryan-leads", "r-suite"]),
    ).toBe(true);
  });

  it("hides the workspace calendar from groups without calendar access", () => {
    expect(
      grantsCalendarAccessForPreview(groups, ["ryan-leads", "events-team"]),
    ).toBe(false);
  });

  it("hides the workspace calendar from a group with no memberships", () => {
    expect(grantsCalendarAccessForPreview(groups, [])).toBe(false);
  });
});
