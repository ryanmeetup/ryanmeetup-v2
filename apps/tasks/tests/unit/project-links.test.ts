import { describe, expect, it } from "vitest";
import { projectCreateSchema } from "@/lib/api-schemas";
import { normalizeProjectLinkUrl } from "@/lib/project-links";

describe("normalizeProjectLinkUrl", () => {
  it("adds HTTPS to a bare domain", () => {
    expect(normalizeProjectLinkUrl("ryanmeetup.com")).toBe(
      "https://ryanmeetup.com",
    );
  });

  it("preserves an explicit HTTP or HTTPS scheme", () => {
    expect(normalizeProjectLinkUrl("https://ryanmeetup.com/docs")).toBe(
      "https://ryanmeetup.com/docs",
    );
    expect(normalizeProjectLinkUrl("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });

  it("normalizes protocol-relative URLs and surrounding whitespace", () => {
    expect(normalizeProjectLinkUrl("  //ryanmeetup.com/docs  ")).toBe(
      "https://ryanmeetup.com/docs",
    );
  });

  it("leaves explicit unsupported schemes for validation to reject", () => {
    expect(normalizeProjectLinkUrl("javascript:alert(1)")).toBe(
      "javascript:alert(1)",
    );
  });

  it("normalizes bare domains at the project API boundary", () => {
    expect(
      projectCreateSchema({
        name: "Website refresh",
        description: "Give the website a fresh coat of Ryan.",
        links: [{ label: "Website", url: "ryanmeetup.com" }],
        ownerIds: ["7b27db83-577d-4de1-b4ca-9f088832f25b"],
      }),
    ).toMatchObject({
      links: [{ label: "Website", url: "https://ryanmeetup.com/" }],
    });
  });
});
