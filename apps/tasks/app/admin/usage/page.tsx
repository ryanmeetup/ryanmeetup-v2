import type { Metadata } from "next";
import { UsagePageClient } from "@/components/usage";
import { demoData } from "@/lib/workspace/demo-data";
import { getResendUsage } from "@/lib/server/resend-usage";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import { pageTitle } from "@/lib/server/instance-settings";
import {
  getDigestRuns,
  getDigestSettings,
} from "@/lib/server/digest-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Usage") } };
}

export default async function UsagePage() {
  if (isWorkspaceDemo()) {
    return (
      <UsagePageClient
        initialData={demoData}
        demoMode
        digestSettings={await getDigestSettings()}
        digestRuns={[]}
        usage={{
          status: "available",
          daily: { used: 34, limit: 100, estimated: true },
          monthly: { used: 1248, limit: 3000, estimated: true },
          recentEmails: [],
          checkedAt: new Date().toISOString(),
          message: "Sample usage is shown in demo mode.",
        }}
      />
    );
  }
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
