import type { Metadata } from "next";
import { AdminStatusesPageClient } from "@/components/admin";
import { loadWorkspacePage } from "@/lib/server/workspace-page-loader";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Statuses") } };
}

export default async function AdminStatusesPage() {
  const { data } = await loadWorkspacePage(
    ["profiles", "statuses", "categories", "projects"],
    { owner: true },
  );
  return <AdminStatusesPageClient initialData={data} demoMode={false} />;
}
