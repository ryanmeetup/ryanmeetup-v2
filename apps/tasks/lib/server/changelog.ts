import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { ChangelogRelease } from "@/lib/changelog";
import { instanceBuild } from "@/lib/instance";

const changelogDirectory = path.join(process.cwd(), "changelog");

function readRelease(fileName: string): ChangelogRelease {
  const source = readFileSync(path.join(changelogDirectory, fileName), "utf8");
  const { data, content } = matter(source);
  const requiredStrings = [
    "slug",
    "author",
    "date",
    "dateLabel",
    "title",
    "summary",
  ] as const;

  for (const field of requiredStrings) {
    if (typeof data[field] !== "string" || !data[field].trim()) {
      throw new Error(`Invalid ${field} in changelog/${fileName}`);
    }
  }
  // `major.minor`, quoted in the frontmatter so 0.10 does not become 0.1.
  // Major 0 is the beta series; 1.0 is reserved for the first release that
  // leaves beta, so no entry can claim to be stable by accident.
  const releaseVersion: unknown = data.version;
  if (
    typeof releaseVersion !== "string" ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(releaseVersion)
  ) {
    throw new Error(`Invalid version in changelog/${fileName}`);
  }
  const majorVersion = Number(releaseVersion.split(".")[0]);
  if (
    !Array.isArray(data.overview) ||
    !data.overview.every((item: unknown) => typeof item === "string")
  ) {
    throw new Error(`Invalid overview in changelog/${fileName}`);
  }

  return {
    version: `${instanceBuild.changelogVersionPrefix} v${releaseVersion}`,
    releaseVersion,
    prerelease: majorVersion < 1,
    slug: data.slug,
    author: data.author,
    date: data.date,
    dateLabel: data.dateLabel,
    title: data.title,
    summary: data.summary,
    overview: data.overview,
    content: content.trim(),
  };
}

export const changelog = readdirSync(changelogDirectory)
  .filter((fileName) => fileName.endsWith(".md"))
  .map(readRelease)
  .sort((left, right) => right.date.localeCompare(left.date));

export const latestChangelogRelease = changelog[0];

export const findChangelogRelease = (slug: string) =>
  changelog.find((release) => release.slug === slug);
