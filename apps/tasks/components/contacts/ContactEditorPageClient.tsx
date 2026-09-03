"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  wideEditorPageContentClassName,
  WorkspacePageShell,
} from "@/components/global";
import type { Contact } from "@/lib/contacts/contact-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import { ContactEditor } from "./ContactEditor";
import { useContactSave } from "./useContactSave";

/**
 * `/contacts/new` and `/contacts/[id]/edit` — the contact editor as a page.
 *
 * The contact list is not loaded here; only the one contact being edited. The
 * shared `useContactSave` still takes a contacts setter, so this passes a
 * throwaway one — the route navigates back to `/contacts` on success, which
 * refetches the real list from the server.
 */
export function ContactEditorPageClient({
  initialData,
  demoMode,
  contact,
  backHref,
}: {
  initialData: WorkspaceData;
  demoMode: boolean;
  /** Omitted for the create route. */
  contact?: Contact;
  backHref: string;
}) {
  const [data, setData] = useState(initialData);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setContacts] = useState<Contact[]>(contact ? [contact] : []);
  const router = useRouter();
  const { saving, saveContact } = useContactSave({
    demoMode,
    editing: contact,
    setContacts,
    onSaved: () => router.push(backHref),
  });

  return (
    <WorkspacePageShell
      data={data}
      demoMode={demoMode}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      setData={setData}
      contentClassName={wideEditorPageContentClassName}
    >
      <ContactEditor
        presentation="page"
        backHref={backHref}
        contact={contact}
        open
        saving={saving}
        onClose={() => router.push(backHref)}
        onSave={(draft, imageFile) => void saveContact(draft, imageFile)}
      />
    </WorkspacePageShell>
  );
}
