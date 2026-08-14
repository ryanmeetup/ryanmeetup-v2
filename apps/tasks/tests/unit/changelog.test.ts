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
      "RMT v4",
      "RMT v3",
      "RMT v2",
      "RMT v1",
    ]);
    expect(latestChangelogRelease.version).toBe("RMT v4");
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
