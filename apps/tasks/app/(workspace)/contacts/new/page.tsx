import type { Metadata } from "next";
import { ContactEditorPageClient } from "@/components/contacts";
import { demoData } from "@/lib/workspace/demo-data";
import { CONTACTS_HREF } from "@/lib/contacts/contact-slug";
import { redirectAccessPreviewAway } from "@/lib/server/editor-page-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("New Contact") } };
}

/** The contact create route for every viewport. */
export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirectAccessPreviewAway(await searchParams, CONTACTS_HREF);

  if (await isWorkspaceDemo()) {
    return <ContactEditorPageClient initialData={demoData} demoMode />;
  }

  const { data } = await loadWorkspacePage(
    ["profiles", "statuses", "categories", "projects"],
    { area: "contacts" },
  );
  return <ContactEditorPageClient initialData={data} demoMode={false} />;
}
