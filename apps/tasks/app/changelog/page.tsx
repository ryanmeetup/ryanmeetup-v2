import type { Metadata } from "next";
import { ChangelogPageClient } from "@/components/changelog";
import { loadChangelogPage } from "@/lib/server/changelog-page-loader";

export const metadata: Metadata = {
  title: { absolute: "Changelog | Ryan Meetup Tasks" },
};

export default async function ChangelogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { initialData, demoMode } = await loadChangelogPage(
    await searchParams,
  );
  return (
    <ChangelogPageClient initialData={initialData} demoMode={demoMode} />
  );
}
