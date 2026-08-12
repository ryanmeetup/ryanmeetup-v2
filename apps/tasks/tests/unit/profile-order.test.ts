import { describe, expect, it } from "vitest";
import type { Profile } from "@/lib/types";
import { prioritizeCurrentProfile } from "@/lib/profile-order";

const profile = (id: string): Profile => ({
  id,
  full_name: id,
  avatar_url: null,
  onboarding_completed: true,
  task_details_open_by_default: false,
});

describe("prioritizeCurrentProfile", () => {
  it("moves the current profile first while preserving teammate order", () => {
    const profiles = [profile("alex"), profile("ryan"), profile("sam")];

    expect(prioritizeCurrentProfile(profiles, "ryan").map(({ id }) => id)).toEqual(
      ["ryan", "alex", "sam"],
    );
    expect(profiles.map(({ id }) => id)).toEqual(["alex", "ryan", "sam"]);
  });

  it("leaves the list unchanged when the current profile is unavailable", () => {
    const profiles = [profile("alex"), profile("sam")];

    expect(prioritizeCurrentProfile(profiles, "ryan")).toBe(profiles);
  });
});
