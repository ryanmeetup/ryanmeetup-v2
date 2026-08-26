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
  it("presents as an unnamed workspace when nothing is configured", async () => {
    const { instanceBuild, instanceDefaults, instancePageTitle } =
      await loadInstance();
    const instance = instanceDefaults;

    expect(instance.name).toBe("Workspace");
    expect(instance.productName).toBe("Workspace Tasks");
    expect(instanceBuild.taskKeyPrefix).toBe("TASK");
    expect(instanceBuild.changelogVersionPrefix).toBe("TASK");
    expect(instance.accentColor).toBe("#ee1a25");
    expect(instance.monogram).toBe("W");
    expect(instance.logoPath).toBeNull();
    expect(instance.description).toBe(
      "A shared workspace for planning projects, assigning tasks, and keeping work moving.",
    );
    expect(instance.ogAlt).toBe("Workspace Tasks — private team workspace");
    // No organization is named, so there is nothing to put under the wordmark
    // and no accounts to link.
    expect(instance.footerSubtitle).toBe("");
    expect(instance.footerSocials).toEqual([]);
    expect(instancePageTitle(instance, "Dashboard")).toBe(
      "Dashboard | Workspace Tasks",
    );
  });

  it("carries no Ryan Meetup identity in the compiled defaults", async () => {
    const { instanceDefaults } = await loadInstance();
    const identity = [
      instanceDefaults.name,
      instanceDefaults.productName,
      instanceDefaults.description,
      instanceDefaults.footerSubtitle,
      instanceDefaults.ogAlt,
      ...instanceDefaults.footerSocials.map((social) => social.url),
    ].join(" ");

    expect(identity).not.toMatch(/ryan meetup|bryans|ryanmeetup/i);
  });

  it("wears the Ryan Meetup identity only when configured to", async () => {
    const instance = (
      await loadInstance({
        NEXT_PUBLIC_INSTANCE_NAME: "Ryan Meetup",
        NEXT_PUBLIC_INSTANCE_FOOTER_SUBTITLE: "NO BRYANS ALLOWED",
      })
    ).instanceDefaults;

    expect(instance.name).toBe("Ryan Meetup");
    expect(instance.productName).toBe("Ryan Meetup Tasks");
    expect(instance.monogram).toBe("R");
    expect(instance.footerSubtitle).toBe("NO BRYANS ALLOWED");
    expect(instance.description).toBe(
      "The private workspace for the Ryan Meetup core team to plan projects and keep work moving.",
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

  it("keeps neutral task keys for a configured deployment", async () => {
    const { instanceBuild } = await loadInstance({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    });

    // Configuring Supabase says nothing about who the instance is, so the
    // prefix stays neutral until the instance names one.
    expect(instanceBuild.taskKeyPrefix).toBe("TASK");
    expect(instanceBuild.changelogVersionPrefix).toBe("TASK");
  });

  it("takes the instance's own key prefix when it sets one", async () => {
    const { instanceBuild } = await loadInstance({
      NEXT_PUBLIC_TASK_KEY_PREFIX: "rmt",
    });

    // Upper-cased on the way in, and the changelog follows it by default.
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
      footerSubtitle: instanceDefaults.footerSubtitle,
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

describe("instance feedback destination", () => {
  it("points at the maintainer until an instance says otherwise", async () => {
    const { instanceDefaults } = await loadInstance();

    // Like the build credit, this names who maintains the software rather
    // than whose workspace this is, so it holds for every deployment except
    // the one where the product is built.
    expect(instanceDefaults.betaBannerEnabled).toBe(true);
    expect(instanceDefaults.feedbackInWorkspace).toBe(false);
    expect(instanceDefaults.feedbackUrl).toBe("mailto:ryan@ryanmeetup.com");
  });

  it("neither claims a channel nor publishes an address in the demo", async () => {
    const { demoInstanceSettings } = await loadInstance();

    expect(demoInstanceSettings.betaBannerEnabled).toBe(false);
    expect(demoInstanceSettings.feedbackInWorkspace).toBe(false);
    expect(demoInstanceSettings.feedbackUrl).toBeNull();
  });

  it("takes an https page or a mailto address", async () => {
    const page = await loadInstance({
      NEXT_PUBLIC_INSTANCE_FEEDBACK_URL: "https://acme.example/feedback",
    });
    expect(page.instanceDefaults.feedbackUrl).toBe(
      "https://acme.example/feedback",
    );

    const inbox = await loadInstance({
      NEXT_PUBLIC_INSTANCE_FEEDBACK_URL: "mailto:team@acme.example",
    });
    expect(inbox.instanceDefaults.feedbackUrl).toBe("mailto:team@acme.example");
  });

  it("rejects anything that is not a linkable destination", async () => {
    await expect(
      loadInstance({ NEXT_PUBLIC_INSTANCE_FEEDBACK_URL: "acme.example" }),
    ).rejects.toThrow(/FEEDBACK_URL/);
    await expect(
      loadInstance({
        NEXT_PUBLIC_INSTANCE_FEEDBACK_URL: "javascript:alert(1)",
      }),
    ).rejects.toThrow(/FEEDBACK_URL/);
  });

  it("lets the dogfooding instance take feedback as its own tasks", async () => {
    const { instanceDefaults } = await loadInstance({
      NEXT_PUBLIC_INSTANCE_FEEDBACK_IN_WORKSPACE: "true",
      NEXT_PUBLIC_INSTANCE_BETA_BANNER: "false",
    });

    expect(instanceDefaults.feedbackInWorkspace).toBe(true);
    expect(instanceDefaults.betaBannerEnabled).toBe(false);
  });

  it("lets a stored row turn the banner off and drop the link", async () => {
    const { resolveInstanceSettings } = await loadInstance();
    const resolved = resolveInstanceSettings({
      betaBannerEnabled: false,
      feedbackUrl: null,
    });

    expect(resolved.betaBannerEnabled).toBe(false);
    expect(resolved.feedbackUrl).toBeNull();
  });
});

describe("instance footer composition", () => {
  it("ships a minimal footer carrying the stack column and author credit", async () => {
    const { instanceDefaults } = await loadInstance();

    // The marketing-scale `branded` layout is opt-in: an instance that has not
    // named itself has no wordmark worth setting six lines tall.
    expect(instanceDefaults.footerVariant).toBe("minimal");
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

  it("lets an instance opt up to the branded footer and its own credit sentence", async () => {
    const { resolveInstanceSettings } = await loadInstance();
    const resolved = resolveInstanceSettings({
      footerVariant: "branded",
      creditPrefix: "Built by ",
      creditLabel: "Acme",
      creditSuffix: ".",
    });

    expect(resolved.footerVariant).toBe("branded");
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

    expect(instanceDefaults.footerVariant).toBe("minimal");
  });
});
