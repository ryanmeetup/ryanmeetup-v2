import { describe, expect, it } from "vitest";
import {
  appendAttachmentDraft,
  createNoteDraft,
  partitionAttachmentDrafts,
  removeAttachmentDraft,
  normalizeResourceLinks,
} from "@/lib/resources/resource-attachment-drafts";

describe("resource attachment drafts", () => {
  it("creates trimmed category notes and preserves their resource shape", () => {
    const draft = createNoteDraft({
      kind: "category",
      resourceId: "category-1",
      currentUserId: "profile-1",
      name: "  Brief  ",
      body: "  Useful context  ",
    });
    expect(draft).toMatchObject({
      category_id: "category-1",
      kind: "note",
      name: "Brief",
      body: "Useful context",
    });
    expect("project_id" in draft).toBe(false);
  });

  it("appends, partitions, and removes drafts without mutating input", () => {
    const note = createNoteDraft({
      kind: "project",
      currentUserId: "profile-1",
      name: "Note",
      body: "Body",
    });
    const file = { ...note, id: "file-1", kind: "file" as const, body: null };
    const original = [note];
    const appended = appendAttachmentDraft(original, file);
    expect(original).toHaveLength(1);
    expect(partitionAttachmentDrafts(appended)).toEqual({
      notes: [note],
      files: [file],
    });
    expect(removeAttachmentDraft(appended, note.id)).toEqual([file]);
  });

  it("normalizes link fields for both create and edit payloads", () => {
    expect(normalizeResourceLinks([{ label: "  Docs ", url: " https://example.com/docs " }])).toEqual([
      { label: "Docs", url: "https://example.com/docs" },
    ]);
  });
});
