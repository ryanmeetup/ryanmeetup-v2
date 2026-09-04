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
      "TASK v0.7",
      "TASK v0.6",
      "TASK v0.5",
      "TASK v0.4",
      "TASK v0.3",
      "TASK v0.2",
      "TASK v0.1",
    ]);
    expect(latestChangelogRelease.version).toBe("TASK v0.7");
    // 1.0 is the first release out of beta, so nothing published yet claims it.
    expect(changelog.every((release) => release.prerelease)).toBe(true);
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
