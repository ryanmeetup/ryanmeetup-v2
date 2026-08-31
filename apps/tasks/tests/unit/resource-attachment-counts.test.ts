import { describe, expect, it, vi } from "vitest";
import { loadResourceAttachmentCounts } from "@/lib/server/resource-attachment-persistence";

function database(
  responses: Record<string, { data?: unknown[]; error?: unknown }>,
) {
  return {
    from: (table: string) => ({
      select: () =>
        Promise.resolve({
          data: responses[table]?.data ?? null,
          error: responses[table]?.error ?? null,
        }),
    }),
  } as never;
}

describe("resource attachment counts", () => {
  it("tallies each resource and omits the ones with none", async () => {
    const counts = await loadResourceAttachmentCounts(
      database({
        project_attachments: {
          data: [
            { project_id: "project-1" },
            { project_id: "project-1" },
            { project_id: "project-2" },
          ],
        },
        category_attachments: { data: [{ category_id: "category-1" }] },
      } as never),
    );
    expect(counts).toEqual({
      projects: { "project-1": 2, "project-2": 1 },
      categories: { "category-1": 1 },
    });
    // A resource with no attachments is absent rather than zero; the caller is
    // what turns a missing entry in a loaded map into zero.
    expect(counts?.projects["project-3"]).toBeUndefined();
  });

  it("returns empty maps, not undefined, when nothing is attached anywhere", async () => {
    const counts = await loadResourceAttachmentCounts(
      database({
        project_attachments: { data: [] },
        category_attachments: { data: [] },
      } as never),
    );
    // Distinguishable from a failure: the caller reads every lookup as zero and
    // skips the loading placeholder entirely.
    expect(counts).toEqual({ projects: {}, categories: {} });
  });

  it("reports undefined when a count query fails so callers fall back", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const counts = await loadResourceAttachmentCounts(
      database({
        project_attachments: { error: { message: "permission denied" } },
        category_attachments: { data: [{ category_id: "category-1" }] },
      } as never),
    );
    expect(counts).toBeUndefined();
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});
