import { describe, expect, it } from "vitest";
import { instanceSettingsSchema } from "@/lib/api-schema";

describe("instanceSettingsSchema", () => {
  it("accepts a partial update and leaves absent keys alone", () => {
    expect(instanceSettingsSchema({ name: "  Acme  " })).toEqual({
      name: "Acme",
    });
  });

  it("clears any field with an explicit null", () => {
    // Every column is nullable, and null is how the form drops a stored
    // override so the value goes back to the build-time default.
    expect(instanceSettingsSchema({ name: null })).toEqual({ name: null });
  });

  it("requires https for every URL, matching the column checks", () => {
    expect(instanceSettingsSchema({ githubUrl: "not a url" })).toBeNull();
  });

  it("accepts an https page or a mailto address as the banner link", () => {
    expect(
      instanceSettingsSchema({ bannerLinkUrl: " https://acme.example/bugs " }),
    ).toEqual({ bannerLinkUrl: "https://acme.example/bugs" });
    expect(
      instanceSettingsSchema({ bannerLinkUrl: "mailto:team@acme.example" }),
    ).toEqual({ bannerLinkUrl: "mailto:team@acme.example" });
    expect(
      instanceSettingsSchema({ bannerLinkUrl: "acme.example" }),
    ).toBeNull();
    expect(
      instanceSettingsSchema({ bannerLinkUrl: "javascript:alert(1)" }),
    ).toBeNull();
    // Clearing it is how an instance offers no link at all.
    expect(instanceSettingsSchema({ bannerLinkUrl: null })).toEqual({
      bannerLinkUrl: null,
    });
  });

  it("takes the notice and its link label as the instance's own words", () => {
    expect(
      instanceSettingsSchema({
        bannerMessage: "  Read-only until 3pm.  ",
        bannerLinkLabel: " See the status page ",
      }),
    ).toEqual({
      bannerMessage: "Read-only until 3pm.",
      bannerLinkLabel: "See the status page",
    });
    // Both are one line of chrome above the workspace, so both are bounded.
    expect(
      instanceSettingsSchema({ bannerMessage: "x".repeat(201) }),
    ).toBeNull();
    expect(
      instanceSettingsSchema({ bannerLinkLabel: "x".repeat(61) }),
    ).toBeNull();
    // Clearing either falls back: the deployment's notice, and a label
    // derived from the address.
    expect(
      instanceSettingsSchema({ bannerMessage: null, bannerLinkLabel: null }),
    ).toEqual({ bannerMessage: null, bannerLinkLabel: null });
  });

  it("keeps the banner switch off when it is set to false", () => {
    // `false` is a value, not an absent field: it is how an instance hides the
    // banner entirely.
    expect(instanceSettingsSchema({ bannerEnabled: false })).toEqual({
      bannerEnabled: false,
    });
    expect(instanceSettingsSchema({ bannerEnabled: "yes" })).toBeNull();
  });

  it("rejects footer presentation updates", () => {
    expect(instanceSettingsSchema({ footerSubtitle: "Est. 2019" })).toBeNull();
    expect(instanceSettingsSchema({ footerSections: [] })).toBeNull();
    expect(instanceSettingsSchema({ footerSocials: [] })).toBeNull();
    expect(instanceSettingsSchema({ creditLabel: "Acme" })).toBeNull();
  });

  it("rejects unknown keys and empty bodies", () => {
    expect(instanceSettingsSchema({ taskKeyPrefix: "PRS" })).toBeNull();
    expect(instanceSettingsSchema({})).toBeNull();
  });

  it("holds the monogram to a single character", () => {
    expect(instanceSettingsSchema({ monogram: " L " })).toEqual({
      monogram: "L",
    });
    expect(instanceSettingsSchema({ monogram: "RM" })).toBeNull();
  });
});
