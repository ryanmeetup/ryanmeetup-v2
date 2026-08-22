export type ChangelogRelease = {
  /** Display version, e.g. "RMT v5". Built from the instance prefix. */
  version: `${string} v${number}`;
  /** Release number as written in the markdown frontmatter. */
  releaseNumber: number;
  slug: string;
  author: string;
  date: string;
  dateLabel: string;
  title: string;
  summary: string;
  overview: string[];
  content: string;
};

export const changelogReleasePath = (release: ChangelogRelease) =>
  `/changelog/${release.slug}`;
