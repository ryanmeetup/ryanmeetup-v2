import { describe, expect, it } from "vitest";
import {
  archiveFilter,
  filterAndSortResources,
  resourceSearchText,
  sameIds,
} from "@/lib/resource-management";

const resources = [
  { name: "Zulu", archived_at: null },
  { name: "Alpha", archived_at: "2026-08-01T00:00:00.000Z" },
  { name: "Bravo", archived_at: null },
];

describe("resource management", () => {
  it("normalizes archive filters", () => {
    expect(archiveFilter("archived")).toBe("archived");
    expect(archiveFilter("all")).toBe("all");
    expect(archiveFilter("unexpected")).toBe("active");
  });

  it("filters and alphabetizes resources", () => {
    expect(filterAndSortResources(resources, "active").map((item) => item.name)).toEqual([
      "Bravo",
      "Zulu",
    ]);
    expect(filterAndSortResources(resources, "archived").map((item) => item.name)).toEqual([
      "Alpha",
    ]);
  });

  it("compares owner ids without depending on order", () => {
    expect(sameIds(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameIds(["a"], ["a", "b"])).toBe(false);
  });

  it("builds searchable text from resource fields and links", () => {
    expect(
      resourceSearchText({
        name: "Launch",
        description: "Big Event",
        links: [{ label: "Brief", url: "https://example.com" }],
      }),
    ).toContain("launch big event brief https://example.com");
  });
});
