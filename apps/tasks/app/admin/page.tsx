import type { Metadata } from "next";
import { AdminOverviewPageClient } from "@/components/admin";
import { getIntegrationHealth } from "@/lib/server/integration-health";
import { loadWorkspacePage } from "@/lib/server/workspace-page-loader";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Admin") } };
}

export default async function AdminPage() {
  const integrations = await getIntegrationHealth();
  const { data } = await loadWorkspacePage(
    ["profiles", "statuses", "categories", "projects"],
    { owner: true },
  );
  return (
    <AdminOverviewPageClient
      initialData={data}
      demoMode={false}
      integrations={integrations}
    />
  );
}
