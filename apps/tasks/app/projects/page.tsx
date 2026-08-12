import { ProjectsPageClient } from "@/components/projects";
import { demoData } from "@/lib/demo-data";
import { requireQueryData } from "@/lib/workspace-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import {
  ACCESS_PREVIEW_PARAM,
  applyAccessPreview,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access-preview";
import { resolveAccessPreview } from "@/lib/access-preview-server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Projects | Ryan Meetup Tasks" },
};

export default async function ProjectsPage({
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
  if (demoMode) return <ProjectsPageClient initialData={demoData} demoMode />;

  const loaded = await loadWorkspacePage([
    "profiles",
    "projects",
    "projectOwners",
    "categories",
    "categoryOwners",
    "statuses",
  ]);
  const { supabase } = loaded;
  let initialData = loaded.data;

  if (requestedGroupPreview || requestedUserPreview) {
    const isOwner = requireQueryData(
      "owner access",
      await supabase.rpc("is_app_owner"),
    );
    if (isOwner) {
      const resolvedPreview = await resolveAccessPreview(supabase, {
        groupId: requestedGroupPreview,
        userId: requestedUserPreview,
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

  return <ProjectsPageClient initialData={initialData} demoMode={false} />;
}
