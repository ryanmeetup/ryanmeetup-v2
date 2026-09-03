import type { Metadata } from "next";
import { ContactEditorPageClient } from "@/components/contacts";
import { demoData } from "@/lib/workspace/demo-data";
import {
  editorBackHref,
  redirectAccessPreviewAway,
} from "@/lib/server/editor-page-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("New Contact") } };
}

/** The mobile create route; `/contacts` keeps the dialog for desktop. */
export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const backHref = editorBackHref(query.from, "/contacts");
  redirectAccessPreviewAway(query, backHref);

  if (await isWorkspaceDemo()) {
    return (
      <ContactEditorPageClient
        initialData={demoData}
        demoMode
        backHref={backHref}
      />
    );
  }

  const { data } = await loadWorkspacePage(
    ["profiles", "statuses", "categories", "projects"],
    { area: "contacts" },
  );
  return (
    <ContactEditorPageClient
      initialData={data}
      demoMode={false}
      backHref={backHref}
    />
  );
}
