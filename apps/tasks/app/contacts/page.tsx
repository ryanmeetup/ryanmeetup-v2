import type { Metadata } from "next";
import { ContactsPageClient } from "@/components/contacts";
import { demoData } from "@/lib/demo-data";
import { loadContacts } from "@/lib/server/contacts";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import { requireQueryData } from "@/lib/workspace-loader";

export const metadata: Metadata = {
  title: { absolute: "Contacts | Ryan Meetup Tasks" },
};

export default async function ContactsPage() {
  const demoMode = isWorkspaceDemo();
  if (demoMode)
    return (
      <ContactsPageClient
        initialData={demoData}
        initialContacts={[]}
        demoMode
      />
    );
  const loaded = await loadWorkspacePage([
    "profiles",
    "statuses",
    "categories",
    "projects",
    "tasks",
    "taskCategories",
  ]);
  const contactsResult = await loadContacts(loaded.supabase);
  return (
    <ContactsPageClient
      initialData={loaded.data}
      initialContacts={requireQueryData("contacts", contactsResult)}
      demoMode={false}
    />
  );
}
