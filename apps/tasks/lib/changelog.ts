export type ChangelogRelease = {
  version: `RMT v${number}`;
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
