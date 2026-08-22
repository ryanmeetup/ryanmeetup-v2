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
    expect(
      instanceSettingsSchema({ name: null, footerSubtitle: null }),
    ).toEqual({ name: null, footerSubtitle: null });
  });

  it("requires https for every URL, matching the column checks", () => {
    expect(instanceSettingsSchema({ creditUrl: "https://ryanle.dev" })).toEqual(
      { creditUrl: "https://ryanle.dev/" },
    );
    expect(instanceSettingsSchema({ creditUrl: "http://ryanle.dev" })).toBeNull();
    expect(instanceSettingsSchema({ githubUrl: "not a url" })).toBeNull();
  });

  it("keeps emptied footer lists rather than reading them as no change", () => {
    expect(
      instanceSettingsSchema({ footerSections: [], footerSocials: [] }),
    ).toEqual({ footerSections: [], footerSocials: [] });
  });

  it("validates footer sections and the footer variant", () => {
    expect(
      instanceSettingsSchema({
        footerSections: [
          { title: "Built with", links: [{ label: "Next.js", url: "nextjs.org" }] },
        ],
      }),
    ).toEqual({
      footerSections: [
        {
          title: "Built with",
          links: [{ label: "Next.js", url: "https://nextjs.org/" }],
        },
      ],
    });
    // A column with no heading, and a link with no label, are both rejected.
    expect(
      instanceSettingsSchema({ footerSections: [{ title: "", links: [] }] }),
    ).toBeNull();
    expect(
      instanceSettingsSchema({
        footerSections: [
          { title: "Docs", links: [{ label: "", url: "https://a.co" }] },
        ],
      }),
    ).toBeNull();
    expect(instanceSettingsSchema({ footerVariant: "minimal" })).toEqual({
      footerVariant: "minimal",
    });
    expect(instanceSettingsSchema({ footerVariant: "enormous" })).toBeNull();
  });

  it("validates footer socials against the known platforms", () => {
    expect(
      instanceSettingsSchema({
        footerSocials: [{ platform: "linkedin", url: "linkedin.com/in/x" }],
      }),
    ).toEqual({
      footerSocials: [
        { platform: "linkedin", url: "https://linkedin.com/in/x" },
      ],
    });
    expect(
      instanceSettingsSchema({
        footerSocials: [{ platform: "myspace", url: "https://a.co" }],
      }),
    ).toBeNull();
    // The same network twice would render the same icon twice.
    expect(
      instanceSettingsSchema({
        footerSocials: [
          { platform: "github", url: "https://github.com/a" },
          { platform: "github", url: "https://github.com/b" },
        ],
      }),
    ).toBeNull();
    expect(
      instanceSettingsSchema({
        footerSocials: [{ platform: "github", url: "http://github.com/a" }],
      }),
    ).toBeNull();
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
