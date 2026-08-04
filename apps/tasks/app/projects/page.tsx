import { redirect } from "next/navigation";
import { ProjectsPageClient } from "@/components/ProjectsPageClient";
import { demoData } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { loadWorkspace, requireQueryData } from "@/lib/workspace-loader";
import {
  ACCESS_PREVIEW_PARAM,
  applyAccessPreview,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access-preview";
import { resolveAccessPreview } from "@/lib/access-preview-server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
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
  const demoMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (demoMode) return <ProjectsPageClient initialData={demoData} demoMode />;

  const supabase = await createClient();
  const auth = requireQueryData("authenticated user", await supabase.auth.getUser());
  if (!auth.user) redirect("/login");

  let initialData = await loadWorkspace(supabase, auth.user.id, [
    "profiles", "projects", "projectOwners", "categories", "statuses",
  ]);
  if (!initialData) redirect("/login?error=profile");
  if (!initialData.currentProfile.onboarding_completed) redirect("/profile");

  if (requestedGroupPreview || requestedUserPreview) {
    const isOwner = requireQueryData("owner access", await supabase.rpc("is_app_owner"));
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
