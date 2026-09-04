import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactEditorPageClient } from "@/components/contacts";
import { demoContacts, demoData } from "@/lib/workspace/demo-data";
import {
  CONTACTS_HREF,
  findContactByRouteId,
} from "@/lib/contacts/contact-slug";
import { loadContact, loadContactRefs } from "@/lib/server/contacts";
import { redirectAccessPreviewAway } from "@/lib/server/editor-page-loader";
import { isNoRowsFound } from "@/lib/server/supabase-errors";
import {
  requireQueryData,
  requireQueryResult,
} from "@/lib/server/workspace-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Edit Contact") } };
}

/**
 * The contact edit route for every viewport.
 *
 * The segment is the contact's slug — `/contacts/the-lantern-room/edit` — and
 * an id still resolves for links shared before slugs existed and for the two
 * contacts that share a display name. `findContactByRouteId` decides which.
 */
export default async function EditContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ contact: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { contact: routeId } = await params;
  redirectAccessPreviewAway(await searchParams, CONTACTS_HREF);

  if (await isWorkspaceDemo()) {
    const contact = findContactByRouteId(demoContacts, routeId);
    if (!contact) notFound();
    return (
      <ContactEditorPageClient
        initialData={demoData}
        demoMode
        contact={contact}
      />
    );
  }

  const loaded = await loadWorkspacePage(
    ["profiles", "statuses", "categories", "projects"],
    { area: "contacts" },
  );
  // RLS hides a contact this member cannot reach, so an unreachable contact is
  // simply absent from the names the slug resolves against.
  const named = findContactByRouteId(
    requireQueryData("contact names", await loadContactRefs(loaded.supabase)),
    routeId,
  );
  if (!named) notFound();

  // `.single()` reports a contact deleted between the two queries the same way
  // it reports one that never existed. Both are a 404; anything else is a real
  // failure and still propagates.
  const result = await loadContact(loaded.supabase, named.id);
  if (isNoRowsFound(result.error?.code)) notFound();
  const contact = requireQueryResult("edited contact", result);
  if (!contact) notFound();

  return (
    <ContactEditorPageClient
      initialData={loaded.data}
      demoMode={false}
      contact={contact}
    />
  );
}
