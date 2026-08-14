import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { ChangelogRelease } from "@/lib/changelog";

const changelogDirectory = path.join(process.cwd(), "changelog");

function readRelease(fileName: string): ChangelogRelease {
  const source = readFileSync(path.join(changelogDirectory, fileName), "utf8");
  const { data, content } = matter(source);
  const requiredStrings = [
    "version",
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
  if (!/^RMT v\d+$/.test(data.version)) {
    throw new Error(`Invalid version in changelog/${fileName}`);
  }
  if (
    !Array.isArray(data.overview) ||
    !data.overview.every((item: unknown) => typeof item === "string")
  ) {
    throw new Error(`Invalid overview in changelog/${fileName}`);
  }

  return {
    version: data.version as ChangelogRelease["version"],
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
