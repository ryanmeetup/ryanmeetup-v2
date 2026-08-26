import type { Metadata } from "next";
import { UsagePageClient } from "@/components/usage";
import { getResendUsage } from "@/lib/server/resend-usage";
import { loadWorkspacePage } from "@/lib/server/workspace-page-loader";
import { pageTitle } from "@/lib/server/instance-settings";
import { getDigestRuns, getDigestSettings } from "@/lib/server/digest-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Usage") } };
}

export default async function UsagePage() {
  const { data } = await loadWorkspacePage(
    ["profiles", "statuses", "categories", "projects"],
    { owner: true },
  );
  const [usage, digestSettings, digestRuns] = await Promise.all([
    getResendUsage(),
    getDigestSettings(),
    getDigestRuns(),
  ]);
  return (
    <UsagePageClient
      initialData={data}
      demoMode={false}
      usage={usage}
      digestSettings={digestSettings}
      digestRuns={digestRuns}
    />
  );
}
