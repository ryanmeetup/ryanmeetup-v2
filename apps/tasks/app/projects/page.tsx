import { redirect } from "next/navigation";
import { ProjectsPageClient } from "@/components/ProjectsPageClient";
import { demoData } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceData } from "@/lib/types";
import {
  ACCESS_PREVIEW_PARAM,
  applyAccessPreview,
} from "@/lib/access-preview";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const requestedPreview =
    typeof query[ACCESS_PREVIEW_PARAM] === "string"
      ? query[ACCESS_PREVIEW_PARAM]
      : undefined;
  const demoMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (demoMode) return <ProjectsPageClient initialData={demoData} demoMode />;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [
    { data: currentProfile },
    { data: profiles },
    { data: projects },
    { data: categories },
    { data: statuses },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", auth.user.id).single(),
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("projects").select("*").order("name"),
    supabase.from("work_groups").select("*").order("name"),
    supabase.from("statuses").select("*").order("sort_order"),
  ]);
  if (!currentProfile) redirect("/login?error=profile");
  if (!currentProfile.onboarding_completed) redirect("/profile");

  let initialData: WorkspaceData = {
    currentProfile,
    profiles: profiles ?? [],
    projects: projects ?? [],
    projectOwners: [],
    tasks: [],
    statuses: statuses ?? [],
    workGroups: [],
    categories: categories ?? [],
    subtasks: [],
    comments: [],
    activity: [],
    attachments: [],
    labels: [],
    taskAssignees: [],
    taskLabels: [],
    taskCategories: [],
  };

  if (requestedPreview) {
    const { data: isOwner } = await supabase.rpc("is_app_owner");
    if (isOwner) {
      const [{ data: previewGroup }, { data: previewGrants }] =
        await Promise.all([
          supabase
            .from("access_groups")
            .select("id, name")
            .eq("id", requestedPreview)
            .maybeSingle(),
          supabase
            .from("project_group_grants")
            .select("project_id")
            .eq("group_id", requestedPreview),
        ]);
      if (previewGroup) {
        initialData = applyAccessPreview(
          initialData,
          { groupId: previewGroup.id, groupName: previewGroup.name },
          (previewGrants ?? []).map((grant) => grant.project_id),
        );
      }
    }
  }

  return <ProjectsPageClient initialData={initialData} demoMode={false} />;
}
