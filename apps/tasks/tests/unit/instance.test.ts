import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `lib/instance.ts` reads its environment once at module load, so each case
 * re-imports it under the environment being exercised.
 */
async function loadInstance(env: Record<string, string> = {}) {
  vi.unstubAllEnvs();
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  return import("@/lib/instance");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("instance identity", () => {
  it("keeps the production identity defaults while demo keys stay neutral", async () => {
    const { instanceBuild, instanceDefaults, instancePageTitle } =
      await loadInstance();
    const instance = instanceDefaults;

    expect(instance.name).toBe("Ryan Meetup");
    expect(instance.productName).toBe("Ryan Meetup Tasks");
    expect(instanceBuild.taskKeyPrefix).toBe("TASK");
    expect(instanceBuild.changelogVersionPrefix).toBe("TASK");
    expect(instance.accentColor).toBe("#ee1a25");
    expect(instance.monogram).toBe("R");
    expect(instance.logoPath).toBeNull();
    expect(instance.description).toBe(
      "The private workspace for the Ryan Meetup core team to plan projects and keep work moving.",
    );
    expect(instance.ogAlt).toBe("Ryan Meetup Tasks — private team workspace");
    expect(instance.footerSubtitle).toBe("NO BRYANS ALLOWED");
    expect(instance.footerSocials.map((social) => social.platform)).toEqual([
      "instagram",
      "youtube",
    ]);
    expect(instancePageTitle(instance, "Dashboard")).toBe(
      "Dashboard | Ryan Meetup Tasks",
    );
  });

  it("derives the product name, description, and monogram from the instance name", async () => {
    const { instanceDefaults: instance, instancePageTitle } =
      await loadInstance({ NEXT_PUBLIC_INSTANCE_NAME: "Ryan Le" });

    expect(instance.productName).toBe("Ryan Le Tasks");
    expect(instance.monogram).toBe("R");
    expect(instance.description).toContain("Ryan Le core team");
    expect(instancePageTitle(instance, "Notes")).toBe("Notes | Ryan Le Tasks");
  });

  it("keeps RMT keys for a configured deployment", async () => {
    const { instanceBuild } = await loadInstance({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    });

    expect(instanceBuild.taskKeyPrefix).toBe("RMT");
    expect(instanceBuild.changelogVersionPrefix).toBe("RMT");
  });

  it("lets an instance override every derived value", async () => {
    const { instanceDefaults: instance } = await loadInstance({
      NEXT_PUBLIC_INSTANCE_NAME: "Ryan Le",
      NEXT_PUBLIC_INSTANCE_PRODUCT_NAME: "Personal Workspace",
      NEXT_PUBLIC_INSTANCE_DESCRIPTION: "My own projects.",
      NEXT_PUBLIC_INSTANCE_MONOGRAM: "L",
      NEXT_PUBLIC_INSTANCE_ACCENT: "#0f766e",
      NEXT_PUBLIC_INSTANCE_LOGO_PATH: "/instance-logo.svg",
      NEXT_PUBLIC_INSTANCE_TAGLINE: "Personal tracker",
    });

    expect(instance.productName).toBe("Personal Workspace");
    expect(instance.description).toBe("My own projects.");
    expect(instance.monogram).toBe("L");
    expect(instance.accentColor).toBe("#0f766e");
    expect(instance.logoPath).toBe("/instance-logo.svg");
    expect(instance.tagline).toBe("Personal tracker");
  });

  it("provides neutral branding for the zero-configuration demo", async () => {
    const { demoInstanceSettings } = await loadInstance();

    expect(demoInstanceSettings).toMatchObject({
      name: "Workspace",
      productName: "Team Tasks",
      tagline: "Team task tracker",
      footerVariant: "minimal",
      footerSections: [],
      footerSocials: [],
    });
    expect(JSON.stringify(demoInstanceSettings)).not.toMatch(
      /ryan meetup|ryancon/i,
    );
  });

  it("keeps the build credit in the demo, where the organization goes neutral", async () => {
    // Neutral branding is about whose workspace this is. The credit is about
    // who wrote the software, which the demo does not change.
    const { demoInstanceSettings, instanceDefaults } = await loadInstance();

    expect(demoInstanceSettings.creditPrefix).toBe(
      instanceDefaults.creditPrefix,
    );
    expect(demoInstanceSettings.creditLabel).toBe(instanceDefaults.creditLabel);
    expect(demoInstanceSettings.creditUrl).toBe(instanceDefaults.creditUrl);
    expect(demoInstanceSettings.creditSuffix).toBe(
      instanceDefaults.creditSuffix,
    );
  });

  it("rejects configuration that would corrupt a pattern, style, or asset URL", async () => {
    await expect(
      loadInstance({ NEXT_PUBLIC_TASK_KEY_PREFIX: "rm-t" }),
    ).rejects.toThrow(/TASK_KEY_PREFIX/);
    await expect(
      loadInstance({ NEXT_PUBLIC_INSTANCE_ACCENT: "red" }),
    ).rejects.toThrow(/ACCENT/);
    await expect(
      loadInstance({
        NEXT_PUBLIC_INSTANCE_LOGO_PATH: "//evil.example/logo.svg",
      }),
    ).rejects.toThrow(/LOGO_PATH/);
  });

});

describe("instance-scoped task keys", () => {
  it("builds, parses, and links task keys with the configured prefix", async () => {
    await loadInstance({ NEXT_PUBLIC_TASK_KEY_PREFIX: "prs" });
    const { taskKey, taskPath, parseTaskKey } =
      await import("@/lib/tasks/task-key");

    expect(taskKey({ task_number: 12 })).toBe("PRS-12");
    expect(taskPath({ task_number: 12 })).toBe("/task/PRS-12");
    expect(parseTaskKey("prs-12")).toBe(12);
    expect(parseTaskKey("RMT-12")).toBeNull();
  });

  it("resolves comment references against the configured prefix", async () => {
    await loadInstance({ NEXT_PUBLIC_TASK_KEY_PREFIX: "PRS" });
    const { taskCommentSegments } =
      await import("@/lib/tasks/task-comment-references");
    const tasks = [{ id: "task-7", task_number: 7, project_id: null }];

    expect(taskCommentSegments("Blocked by PRS-7, not RMT-7.", tasks)).toEqual([
      { kind: "text", value: "Blocked by " },
      { kind: "task", task: tasks[0], value: "PRS-7" },
      { kind: "text", value: ", not RMT-7." },
    ]);
  });
});

describe("instance-scoped changelog versions", () => {
  it("renders release numbers under the task key prefix by default", async () => {
    await loadInstance({ NEXT_PUBLIC_TASK_KEY_PREFIX: "PRS" });
    const { changelog, latestChangelogRelease } =
      await import("@/lib/server/changelog");

    expect(latestChangelogRelease.version).toBe("PRS v5");
    expect(latestChangelogRelease.releaseNumber).toBe(5);
    expect(changelog.map((release) => release.version)).toEqual([
      "PRS v5",
      "PRS v4",
      "PRS v3",
      "PRS v2",
      "PRS v1",
    ]);
  });

  it("allows a changelog prefix that differs from the task key prefix", async () => {
    await loadInstance({
      NEXT_PUBLIC_TASK_KEY_PREFIX: "PRS",
      NEXT_PUBLIC_CHANGELOG_VERSION_PREFIX: "Workspace",
    });
    const { latestChangelogRelease } = await import("@/lib/server/changelog");

    expect(latestChangelogRelease.version).toBe("Workspace v5");
  });
});

describe("runtime instance overrides", () => {
  it("layers stored values over the compiled defaults", async () => {
    const { instanceDefaults, resolveInstanceSettings } = await loadInstance();

    expect(
      resolveInstanceSettings({ name: "Ryan Le", accentColor: "#0f766e" }),
    ).toMatchObject({
      name: "Ryan Le",
      accentColor: "#0f766e",
      // Untouched keys keep the compiled default, including derived ones.
      productName: instanceDefaults.productName,
      footerSubtitle: "NO BRYANS ALLOWED",
    });
  });

  it("falls back to the default when no row is stored", async () => {
    const {
      demoInstanceSettings,
      instanceDefaults,
      resolveInstanceSettings,
    } = await loadInstance();

    expect(resolveInstanceSettings(null)).toEqual(instanceDefaults);
    expect(resolveInstanceSettings({})).toEqual(instanceDefaults);
    expect(resolveInstanceSettings(null, demoInstanceSettings)).toEqual(
      demoInstanceSettings,
    );
  });

  it("honours an explicit null only for values that may be empty", async () => {
    const { instanceDefaults, resolveInstanceSettings } = await loadInstance();
    const resolved = resolveInstanceSettings({
      logoPath: null,
      // A required value cannot be blanked into an empty wordmark.
      name: null,
      footerSubtitle: null,
    });

    expect(resolved.logoPath).toBeNull();
    expect(resolved.name).toBe(instanceDefaults.name);
    expect(resolved.footerSubtitle).toBe(instanceDefaults.footerSubtitle);
  });
});

describe("instance footer composition", () => {
  it("ships the Ryan Meetup content as this build's default branded footer", async () => {
    const { instanceDefaults } = await loadInstance();

    expect(instanceDefaults.footerVariant).toBe("branded");
    expect(instanceDefaults.footerSections).toHaveLength(1);
    expect(instanceDefaults.footerSections[0].title).toBe("Built with");
    expect(
      instanceDefaults.footerSections[0].links.map((link) => link.label),
    ).toEqual([
      "Vercel",
      "Next.js",
      "React",
      "Tailwind CSS",
      "Supabase",
      "Headless UI",
    ]);
    expect(instanceDefaults.creditPrefix).toBe(
      "Website designed and developed by ",
    );
    expect(instanceDefaults.creditSuffix).toBe(". All Rights Reserved.");
  });

  it("lets an instance choose a simpler footer and its own credit sentence", async () => {
    const { resolveInstanceSettings } = await loadInstance();
    const resolved = resolveInstanceSettings({
      footerVariant: "minimal",
      creditPrefix: "Built by ",
      creditLabel: "Acme",
      creditSuffix: ".",
    });

    expect(resolved.footerVariant).toBe("minimal");
    expect(resolved.creditPrefix).toBe("Built by ");
    expect(resolved.creditSuffix).toBe(".");
  });

  it("lets an instance define its own link columns rather than inherit these", async () => {
    const { resolveInstanceSettings } = await loadInstance();
    const resolved = resolveInstanceSettings({
      footerSections: [
        { title: "Company", links: [{ label: "About", url: "https://a.co/" }] },
      ],
      footerSocials: [{ platform: "linkedin", url: "https://linkedin.com/x" }],
    });

    expect(resolved.footerSections[0].title).toBe("Company");
    expect(resolved.footerSocials).toEqual([
      { platform: "linkedin", url: "https://linkedin.com/x" },
    ]);
  });

  it("treats an empty list as a deliberate removal, not an unset value", async () => {
    const { instanceDefaults, resolveInstanceSettings } = await loadInstance();

    // `null` is "no override stored", so the compiled content stands...
    expect(
      resolveInstanceSettings({ footerSections: null, footerSocials: null }),
    ).toMatchObject({
      footerSections: instanceDefaults.footerSections,
      footerSocials: instanceDefaults.footerSocials,
    });
    // ...while an empty array is the owner dropping them outright.
    expect(
      resolveInstanceSettings({ footerSections: [], footerSocials: [] }),
    ).toMatchObject({ footerSections: [], footerSocials: [] });
  });

  it("ignores an unrecognized footer variant from the environment", async () => {
    const { instanceDefaults } = await loadInstance({
      NEXT_PUBLIC_INSTANCE_FOOTER_VARIANT: "enormous",
    });

    expect(instanceDefaults.footerVariant).toBe("branded");
  });
});
