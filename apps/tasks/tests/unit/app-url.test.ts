import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isAllowedTasksRequestOrigin,
  productionTasksAppOrigin,
  tasksAppOrigin,
  tasksAppUrl,
} from "@/lib/app-url";

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

    expect(tasksAppOrigin()).toBe("https://tasks.ryanmeetup.com");
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
