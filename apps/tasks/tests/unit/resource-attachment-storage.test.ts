import { beforeEach, describe, expect, it, vi } from "vitest";

const remove = vi.fn();
vi.mock("@/lib/server/admin-client", () => ({
  getAdminClient: () => ({ storage: { from: () => ({ remove }) } }),
}));

import {
  attachmentObjectPath,
  removeAttachmentObject,
} from "@/lib/server/resource-attachment-storage";

describe("resource attachment storage cleanup", () => {
  beforeEach(() => remove.mockReset());

  it("creates resource-scoped paths with safe file names", () => {
    expect(
      attachmentObjectPath("project", "attachment", "launch brief (final).pdf"),
    ).toBe("project/attachment-launch-brief--final-.pdf");
  });

  it("returns cleanup failures so callers can report or log them", async () => {
    const failure = new Error("storage unavailable");
    remove.mockResolvedValue({ error: failure });
    await expect(
      removeAttachmentObject("project/file.pdf", "project-attachments"),
    ).resolves.toBe(failure);
    expect(remove).toHaveBeenCalledWith(["project/file.pdf"]);
  });
});
