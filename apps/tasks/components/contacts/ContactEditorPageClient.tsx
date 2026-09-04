"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspacePageShell } from "@/components/global";
import { CONTACTS_HREF } from "@/lib/contacts/contact-slug";
import type { Contact } from "@/lib/contacts/contact-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import { ContactEditor } from "./ContactEditor";
import { useContactSave } from "./useContactSave";

/**
 * `/contacts/new` and `/contacts/[contact]/edit` — the contact editor pages.
 *
 * The contact list is not loaded here; only the one contact being edited.
 *
 * Leaving the editor is the browser's own Back, so the list comes back with the
 * search and scroll position it was left at and the editor URL does not have to
 * carry them. Saving is the exception and always navigates: the entry behind
 * Back holds the list as it was before the save, the one version that must not
 * be shown.
 */
/**
 * The path this document opened at, read once per full page load.
 *
 * Back is only the list when an in-app navigation put the editor on top of it.
 * A document that opened straight at the editor — a shared link, a pasted URL,
 * a reload — has whatever the tab was showing before behind it, or nothing at
 * all, so it navigates to the list rather than out of the workspace.
 * `history.length` cannot tell those apart: an unrelated page counts too.
 */
const documentEntryPath =
  typeof window === "undefined" ? null : window.location.pathname;

export function ContactEditorPageClient({
  initialData,
  demoMode,
  contact,
}: {
  initialData: WorkspaceData;
  demoMode: boolean;
  /** Omitted for the create route. */
  contact?: Contact;
}) {
  const [data, setData] = useState(initialData);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const leaveEditor = () => {
    if (documentEntryPath === window.location.pathname)
      router.push(CONTACTS_HREF);
    else router.back();
  };
  const { saving, saveContact } = useContactSave({
    demoMode,
    editing: contact,
    onSaved: () => router.push(CONTACTS_HREF),
  });

  return (
    <WorkspacePageShell
      data={data}
      demoMode={demoMode}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      setData={setData}
      contentClassName="p-4 sm:p-6 lg:p-8"
    >
      <ContactEditor
        backHref={CONTACTS_HREF}
        contact={contact}
        saving={saving}
        onClose={leaveEditor}
        onSave={(draft, imageFile) => void saveContact(draft, imageFile)}
      />
    </WorkspacePageShell>
  );
}
