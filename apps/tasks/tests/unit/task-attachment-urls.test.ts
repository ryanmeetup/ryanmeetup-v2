import { describe, expect, it } from "vitest";
import { normalizeHttpUrl } from "@ryanmeetup/utils";
import { attachmentUrlName } from "@/lib/tasks/task-attachment-urls";

describe("task attachment URLs", () => {
  it("accepts and normalizes HTTP URLs", () => {
    expect(normalizeHttpUrl(" https://example.com/docs/file.pdf ")).toBe(
      "https://example.com/docs/file.pdf",
    );
  });

  it("rejects unsafe URLs and adds HTTPS to bare addresses", () => {
    expect(normalizeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeHttpUrl("example.com/resource")).toBe(
      "https://example.com/resource",
    );
  });

  it("uses the last path segment or hostname as the display name", () => {
    expect(attachmentUrlName("https://example.com/docs/Project%20brief")).toBe(
      "Project brief",
    );
    expect(attachmentUrlName("https://example.com/")).toBe("example.com");
  });
});
