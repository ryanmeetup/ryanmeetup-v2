import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChangelogEntryPageClient } from "@/components/changelog";
import { changelog, findChangelogRelease } from "@/lib/server/changelog";
import { loadChangelogPage } from "@/lib/server/changelog-page-loader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ entry: string }>;
}): Promise<Metadata> {
  const release = findChangelogRelease((await params).entry);
  return release
    ? {
        title: {
          absolute: `${release.version}: ${release.title} | Ryan Meetup Tasks`,
        },
        description: release.summary,
      }
    : {};
}

export default async function ChangelogEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ entry: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const release = findChangelogRelease((await params).entry);
  if (!release) notFound();

  const { initialData, demoMode } = await loadChangelogPage(await searchParams);
  return (
    <ChangelogEntryPageClient
      initialData={initialData}
      demoMode={demoMode}
      release={release}
      changelog={changelog}
    />
  );
}
