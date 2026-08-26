import { afterEach, describe, expect, it, vi } from "vitest";
import {
  developmentFallbackOrigin,
  isAllowedTasksRequestOrigin,
  metadataOrigin,
  tasksAppOrigin,
  tasksAppUrl,
} from "@/lib/app-url";

/**
 * A deployment's canonical origin. Any real domain does; this one is only a
 * stand-in for "the operator configured TASKS_APP_URL".
 */
const productionTasksAppOrigin = "https://tasks.example.com";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Tasks app canonical URLs", () => {
  it("uses an explicit environment-specific canonical origin", () => {
    vi.stubEnv("TASKS_APP_URL", "https://tasks-staging.example.com/path");

    expect(tasksAppUrl("/auth/callback")).toBe(
      "https://tasks-staging.example.com/auth/callback",
    );
  });

  it("keeps the production origin explicit rather than universal", () => {
    vi.stubEnv("TASKS_APP_URL", productionTasksAppOrigin);

    expect(tasksAppOrigin()).toBe(productionTasksAppOrigin);
  });

  it("allows loopback request origins outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TASKS_APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_TASKS_APP_URL", "");

    expect(tasksAppUrl("/profile", "http://127.0.0.1:3100/login")).toBe(
      "http://127.0.0.1:3100/profile",
    );
  });

  it("allows local mutations even when generated links use production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TASKS_APP_URL", productionTasksAppOrigin);

    expect(isAllowedTasksRequestOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedTasksRequestOrigin("http://127.0.0.1:3100")).toBe(true);
    expect(tasksAppOrigin()).toBe(productionTasksAppOrigin);
  });

  it("restricts production mutations to canonical and allowlisted origins", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TASKS_APP_URL", productionTasksAppOrigin);
    vi.stubEnv("TASKS_ALLOWED_ORIGINS", "https://tasks-preview.example.com");

    expect(isAllowedTasksRequestOrigin(productionTasksAppOrigin)).toBe(true);
    expect(isAllowedTasksRequestOrigin("https://tasks-preview.example.com")).toBe(true);
    expect(isAllowedTasksRequestOrigin("https://attacker.example")).toBe(false);
    expect(isAllowedTasksRequestOrigin("http://localhost:3000")).toBe(false);
  });

  it("accepts an allowlisted preview request origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TASKS_APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_TASKS_APP_URL", "");
    vi.stubEnv("TASKS_ALLOWED_ORIGINS", "https://tasks-preview.example.com");

    expect(
      tasksAppUrl(
        "/auth/callback",
        new Request("https://tasks-preview.example.com/auth/callback"),
      ),
    ).toBe("https://tasks-preview.example.com/auth/callback");
  });

  it("does not trust forwarded host headers", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TASKS_APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_TASKS_APP_URL", "");
    vi.stubEnv("TASKS_ALLOWED_ORIGINS", "https://tasks-preview.example.com");
    const request = new Request("https://tasks-preview.example.com/auth/callback", {
      headers: { "x-forwarded-host": "attacker.example" },
    });

    expect(tasksAppOrigin(request)).toBe("https://tasks-preview.example.com");
  });

  it("rejects untrusted request origins and unsafe schemes", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TASKS_APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_TASKS_APP_URL", "");
    vi.stubEnv("TASKS_ALLOWED_ORIGINS", "https://tasks-preview.example.com");

    expect(() => tasksAppOrigin("https://attacker.example/path")).toThrow();
    expect(() => tasksAppOrigin("http://tasks-preview.example.com/path")).toThrow();
  });

  it("rejects protocol-relative destinations", () => {
    vi.stubEnv("TASKS_APP_URL", productionTasksAppOrigin);

    expect(() => tasksAppUrl("//attacker.example/path")).toThrow();
  });
});

describe("metadata origin", () => {
  const clearConfiguration = () => {
    vi.stubEnv("TASKS_APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_TASKS_APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
  };

  it("prefers the configured origin over everything it could infer", () => {
    vi.stubEnv("TASKS_APP_URL", productionTasksAppOrigin);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "ignored.vercel.app");

    expect(
      metadataOrigin(new Headers({ "x-forwarded-host": "ignored.example" })),
    ).toBe(productionTasksAppOrigin);
  });

  it("describes an unconfigured deployment by the domain serving it", () => {
    clearConfiguration();

    expect(
      metadataOrigin(
        new Headers({
          "x-forwarded-host": "projects.example.dev",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe("https://projects.example.dev");
  });

  it("reads the first entry of a proxy chain", () => {
    clearConfiguration();

    expect(
      metadataOrigin(
        new Headers({
          "x-forwarded-host": "projects.example.dev, internal.example",
          "x-forwarded-proto": "https, http",
        }),
      ),
    ).toBe("https://projects.example.dev");
  });

  it("assumes https for a forwarded host that states no protocol", () => {
    clearConfiguration();

    expect(
      metadataOrigin(new Headers({ host: "projects.example.dev" })),
    ).toBe("https://projects.example.dev");
    expect(metadataOrigin(new Headers({ host: "localhost:3000" }))).toBe(
      "http://localhost:3000",
    );
  });

  it("falls back to the production domain when no request is in hand", () => {
    clearConfiguration();
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "projects.example.dev");

    // Static metadata has no request, and VERCEL_URL is deliberately unused
    // because it names the deployment rather than the project.
    vi.stubEnv("VERCEL_URL", "tasks-abc123-xyz.vercel.app");
    expect(metadataOrigin()).toBe("https://projects.example.dev");
  });

  it("never advertises another deployment's domain when nothing resolves", () => {
    clearConfiguration();

    const origin = metadataOrigin();

    expect(origin).toBe(developmentFallbackOrigin);
    expect(origin).not.toMatch(/ryanmeetup/i);
  });
});
