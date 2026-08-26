import { describe, expect, it } from "vitest";
import {
  changelog,
  findChangelogRelease,
  latestChangelogRelease,
} from "@/lib/server/changelog";
import { changelogReleasePath } from "@/lib/changelog";

describe("changelog", () => {
  it("keeps the approved versions in newest-first order", () => {
    expect(changelog.map((release) => release.version)).toEqual([
      "TASK v5",
      "TASK v4",
      "TASK v3",
      "TASK v2",
      "TASK v1",
    ]);
    expect(latestChangelogRelease.version).toBe("TASK v5");
    expect(changelog.every((release) => release.author === "Ryan Le")).toBe(
      true,
    );
    expect(changelog.every((release) => release.content.length > 0)).toBe(true);
  });

  it("builds and resolves stable release paths", () => {
    for (const release of changelog) {
      expect(changelogReleasePath(release)).toBe(`/changelog/${release.slug}`);
      expect(findChangelogRelease(release.slug)).toBe(release);
    }
    expect(findChangelogRelease("not-a-release")).toBeUndefined();
  });
});
