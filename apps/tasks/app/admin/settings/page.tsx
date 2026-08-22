import type { Metadata } from "next";
import { AdminSettingsPageClient } from "@/components/admin";
import { demoData } from "@/lib/workspace/demo-data";
import { buildTimeIdentity } from "@/lib/server/integration-health";
import {
  getInstanceSettingsOverrides,
  pageTitle,
} from "@/lib/server/instance-settings";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Settings") } };
}

export default async function AdminSettingsPage() {
  // The form edits the raw stored row rather than the resolved settings, so it
  // can show which values this instance actually set and which it is
  // inheriting from the build. It resolves the two itself for its live preview.
  const overrides = await getInstanceSettingsOverrides();
  const buildIdentity = buildTimeIdentity();

  if (isWorkspaceDemo())
    return (
      <AdminSettingsPageClient
        initialData={demoData}
        demoMode
        overrides={overrides}
        buildIdentity={buildIdentity}
      />
    );

  const { data } = await loadWorkspacePage(
    ["profiles", "statuses", "categories", "projects"],
    { owner: true },
  );
  return (
    <AdminSettingsPageClient
      initialData={data}
      demoMode={false}
      overrides={overrides}
      buildIdentity={buildIdentity}
    />
  );
}
