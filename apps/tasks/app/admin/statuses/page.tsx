import type { Metadata } from "next";
import { AdminStatusesPageClient } from "@/components/admin";
import { demoData } from "@/lib/workspace/demo-data";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Statuses") } };
}

export default async function AdminStatusesPage() {
  if (isWorkspaceDemo())
    return <AdminStatusesPageClient initialData={demoData} demoMode />;

  const { data } = await loadWorkspacePage(
    ["profiles", "statuses", "categories", "projects"],
    { owner: true },
  );
  return <AdminStatusesPageClient initialData={data} demoMode={false} />;
}
