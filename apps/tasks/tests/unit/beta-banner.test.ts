import { describe, expect, it } from "vitest";
import { betaBannerSegments, betaBannerText } from "@/lib/beta-banner";

const base = {
  productName: "Acme Tasks",
  betaBannerEnabled: true,
  feedbackInWorkspace: false,
  feedbackUrl: "mailto:ryan@ryanmeetup.com",
};

describe("betaBannerSegments", () => {
  it("sends an ordinary instance to the maintainer, not into its own backlog", () => {
    expect(betaBannerText(base)).toBe(
      "Acme Tasks is in beta. Found an issue or have an idea? Email ryan@ryanmeetup.com.",
    );
    expect(betaBannerText(base)).not.toContain("this workspace");
  });

  it("offers both routes where the product is dogfooded", () => {
    expect(betaBannerText({ ...base, feedbackInWorkspace: true })).toBe(
      "Acme Tasks is in beta. Found an issue or have an idea? File a task in this workspace, or email ryan@ryanmeetup.com.",
    );
  });

  it("keeps the workspace on its own when there is no link", () => {
    expect(
      betaBannerText({
        ...base,
        feedbackInWorkspace: true,
        feedbackUrl: null,
      }),
    ).toBe(
      "Acme Tasks is in beta. Found an issue or have an idea? File a task in this workspace.",
    );
  });

  it("drops the invitation when there is nowhere to send anyone", () => {
    expect(betaBannerText({ ...base, feedbackUrl: null })).toBe(
      "Acme Tasks is in beta.",
    );
  });

  it("says nothing at all once an instance turns the banner off", () => {
    expect(
      betaBannerSegments({ ...base, betaBannerEnabled: false }),
    ).toBeNull();
    expect(betaBannerText({ ...base, betaBannerEnabled: false })).toBeNull();
  });

  it("links a page under neutral wording and an address under its own", () => {
    expect(
      betaBannerSegments({
        ...base,
        feedbackUrl: "https://acme.example/feedback",
      }),
    ).toEqual([
      {
        kind: "text",
        value: "Acme Tasks is in beta. Found an issue or have an idea? ",
      },
      {
        kind: "link",
        href: "https://acme.example/feedback",
        value: "Send feedback",
      },
      { kind: "text", value: "." },
    ]);

    const linked = betaBannerSegments(base)?.find(
      (segment) => segment.kind === "link",
    );
    expect(linked).toEqual({
      kind: "link",
      href: "mailto:ryan@ryanmeetup.com",
      value: "Email ryan@ryanmeetup.com",
    });
  });
});
