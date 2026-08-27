import { describe, expect, it } from "vitest";
import {
  authCallbackDestination,
  onboardingHref,
  safeWorkspaceReturnPath,
  workspaceEntryRedirect,
} from "@/lib/workspace/entry-route";

describe("workspace entry routes", () => {
  it("keeps a local workspace destination through onboarding", () => {
    expect(onboardingHref("/projects?archived=true")).toBe(
      "/profile?reason=onboarding&next=%2Fprojects%3Farchived%3Dtrue",
    );
  });

  it.each([
    undefined,
    "https://example.com",
    "//example.com",
    "/login",
    "/profile?reason=onboarding",
    "/auth/callback",
    "/account-error?reason=profile",
  ])("rejects an unsafe return destination: %s", (value) => {
    expect(safeWorkspaceReturnPath(value)).toBe("/");
  });

  it("keeps password recovery separate from workspace onboarding", () => {
    expect(authCallbackDestination("/reset-password")).toBe("/reset-password");
    expect(authCallbackDestination(undefined)).toBe(
      "/profile?reason=onboarding&next=%2F",
    );
  });

  it("distinguishes missing provisioning from incomplete onboarding", () => {
    expect(
      workspaceEntryRedirect({
        allowIncomplete: false,
        hasProfile: false,
        onboardingCompleted: false,
        returnTo: "/projects",
      }),
    ).toBe("/account-error?reason=profile");
    expect(
      workspaceEntryRedirect({
        allowIncomplete: false,
        hasProfile: true,
        onboardingCompleted: false,
        returnTo: "/projects",
      }),
    ).toBe("/profile?reason=onboarding&next=%2Fprojects");
    expect(
      workspaceEntryRedirect({
        allowIncomplete: false,
        hasProfile: true,
        onboardingCompleted: true,
        returnTo: "/projects",
      }),
    ).toBeNull();
  });
});
