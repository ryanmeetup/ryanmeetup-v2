import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactEditorPageClient } from "@/components/contacts";
import { demoContacts, demoData } from "@/lib/workspace/demo-data";
import { loadContact } from "@/lib/server/contacts";
import {
  editorBackHref,
  redirectAccessPreviewAway,
} from "@/lib/server/editor-page-loader";
import { isNoRowsFound } from "@/lib/server/supabase-errors";
import { requireQueryResult } from "@/lib/server/workspace-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Edit Contact") } };
}

/** The mobile edit route; `/contacts` keeps the dialog for desktop. */
export default async function EditContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const backHref = editorBackHref(query.from, "/contacts");
  redirectAccessPreviewAway(query, backHref);

  if (await isWorkspaceDemo()) {
    const contact = demoContacts.find((item) => item.id === id);
    if (!contact) notFound();
    return (
      <ContactEditorPageClient
        initialData={demoData}
        demoMode
        contact={contact}
        backHref={backHref}
      />
    );
  }

  const loaded = await loadWorkspacePage([
    "profiles",
    "statuses",
    "categories",
    "projects",
  ]);
  // RLS hides a contact this member cannot reach, and `.single()` reports that
  // the same way it reports one that does not exist. Both are a 404; anything
  // else is a real failure and still propagates.
  const result = await loadContact(loaded.supabase, id);
  if (isNoRowsFound(result.error?.code)) notFound();
  const contact = requireQueryResult("edited contact", result);
  if (!contact) notFound();

  return (
    <ContactEditorPageClient
      initialData={loaded.data}
      demoMode={false}
      contact={contact}
      backHref={backHref}
    />
  );
}
