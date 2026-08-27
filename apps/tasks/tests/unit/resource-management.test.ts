import { describe, expect, it } from "vitest";
import {
  archiveFilter,
  filterAndSortResources,
  resourceSearchText,
  sameIds,
  uploadResourceAttachments,
} from "@/lib/resources/resource-management";

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
    expect(
      filterAndSortResources(resources, "active").map((item) => item.name),
    ).toEqual(["Bravo", "Zulu"]);
    expect(
      filterAndSortResources(resources, "archived").map((item) => item.name),
    ).toEqual(["Alpha"]);
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

  it("counts failed attachment requests and continues the batch", async () => {
    const originalFetch = global.fetch;
    let calls = 0;
    global.fetch = (async () => {
      calls += 1;
      if (calls === 1) throw new Error("offline");
      return new Response(null, { status: calls === 2 ? 500 : 200 });
    }) as typeof fetch;
    try {
      const attachment = {
        id: "1",
        project_id: "project",
        kind: "note" as const,
        name: "note",
        body: "body",
        url: "",
        file_path: null,
        mime_type: null,
        size_bytes: null,
        created_by: "user",
        created_at: "",
        sort_order: 0,
      };
      await expect(
        uploadResourceAttachments({
          attachments: [
            attachment,
            { ...attachment, id: "2" },
            { ...attachment, id: "3" },
          ],
          resourceId: "project",
          resourceKind: "project",
        }),
      ).resolves.toBe(2);
      expect(calls).toBe(3);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
