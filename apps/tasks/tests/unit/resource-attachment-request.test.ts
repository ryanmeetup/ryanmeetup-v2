import { describe, expect, it } from "vitest";
import {
  attachmentResource,
  parseNoteAttachment,
  validateAttachmentFile,
} from "@/lib/server/resource-attachment-request";

describe("resource attachment request validation", () => {
  it("requires exactly one resource kind", () => {
    expect(attachmentResource(undefined, undefined)).toMatchObject({ status: 400 });
    expect(attachmentResource("category-1", "project-1")).toMatchObject({ status: 400 });
    expect(attachmentResource("category-1", undefined)).toMatchObject({
      kind: "category",
      foreignKey: "category_id",
    });
  });

  it("trims and validates note fields", () => {
    expect(
      parseNoteAttachment({
        projectId: "project-1",
        name: "  Brief ",
        body: " Context ",
      }),
    ).toMatchObject({ name: "Brief", body: "Context" });
    expect(
      parseNoteAttachment({ projectId: "project-1", name: "", body: "Context" }),
    ).toMatchObject({ status: 400 });
  });

  it("rejects empty and oversized files", () => {
    expect(validateAttachmentFile(new File([], "empty.txt"))).toMatchObject({ status: 413 });
    expect(validateAttachmentFile(new File(["ok"], "note.txt"))).toMatchObject({
      file: expect.any(File),
    });
  });
});
