import { describe, expect, it } from "vitest";
import { accessibleCategoryIdsForPreview } from "@/lib/access-preview-server";

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
