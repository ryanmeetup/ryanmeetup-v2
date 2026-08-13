import { describe, expect, it } from "vitest";
import {
  changelog,
  changelogReleasePath,
  findChangelogRelease,
  latestChangelogRelease,
} from "@/lib/changelog";

describe("changelog", () => {
  it("keeps the approved versions in newest-first order", () => {
    expect(changelog.map((release) => release.version)).toEqual([
      "v4",
      "v3",
      "v2",
      "v1",
    ]);
    expect(latestChangelogRelease.version).toBe("v4");
    expect(changelog.every((release) => release.author === "Ryan Le")).toBe(
      true,
    );
  });

  it("builds and resolves stable release paths", () => {
    for (const release of changelog) {
      expect(changelogReleasePath(release)).toBe(
        `/changelog/${release.slug}`,
      );
      expect(findChangelogRelease(release.slug)).toBe(release);
    }
    expect(findChangelogRelease("not-a-release")).toBeUndefined();
  });
});
