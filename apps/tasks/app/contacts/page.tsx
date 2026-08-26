import type { Metadata } from "next";
import { ContactsPageClient } from "@/components/contacts";
import {
  ACCESS_PREVIEW_PARAM,
  applyAccessPreview,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access/access-preview";
import { resolveAccessPreview } from "@/lib/server/access-preview";
import { demoContacts, demoData } from "@/lib/workspace/demo-data";
import { loadContacts } from "@/lib/server/contacts";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import { requireQueryData } from "@/lib/server/workspace-loader";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Contacts") } };
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const requestedGroupPreview =
    typeof query[ACCESS_PREVIEW_PARAM] === "string"
      ? query[ACCESS_PREVIEW_PARAM]
      : undefined;
  const requestedUserPreview =
    typeof query[USER_ACCESS_PREVIEW_PARAM] === "string"
      ? query[USER_ACCESS_PREVIEW_PARAM]
      : undefined;
  const demoMode = isWorkspaceDemo();
  if (demoMode)
    return (
      <ContactsPageClient
        initialData={demoData}
        initialContacts={demoContacts}
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
  // Contacts are a workspace-wide directory: no project or category scoping to
  // narrow here, only the workspace data the shell and sidebar read.
  let initialData = loaded.data;
  if (requestedGroupPreview || requestedUserPreview) {
    const isOwner = requireQueryData(
      "owner access",
      await loaded.supabase.rpc("is_app_owner"),
    );
    if (isOwner) {
      const resolvedPreview = await resolveAccessPreview(loaded.supabase, {
        groupId: requestedGroupPreview,
        userName: requestedUserPreview,
        allProjectIds: initialData.projects.map((project) => project.id),
      });
      if (resolvedPreview) {
        initialData = applyAccessPreview(
          initialData,
          resolvedPreview.preview,
          resolvedPreview.projectIds,
        );
      }
    }
  }
  return (
    <ContactsPageClient
      initialData={initialData}
      initialContacts={requireQueryData("contacts", contactsResult)}
      demoMode={false}
    />
  );
}
