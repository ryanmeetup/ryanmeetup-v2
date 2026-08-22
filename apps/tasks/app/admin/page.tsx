import type { Metadata } from "next";
import { AdminOverviewPageClient } from "@/components/admin";
import { demoData } from "@/lib/workspace/demo-data";
import { getIntegrationHealth } from "@/lib/server/integration-health";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Admin") } };
}

export default async function AdminPage() {
  const integrations = await getIntegrationHealth();
  if (isWorkspaceDemo())
    return (
      <AdminOverviewPageClient
        initialData={demoData}
        demoMode
        integrations={integrations}
      />
    );

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
