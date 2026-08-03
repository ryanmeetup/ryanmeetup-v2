import { redirect } from "next/navigation";
import { ProjectsPageClient } from "@/components/ProjectsPageClient";
import { demoData } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceData } from "@/lib/types";

export default async function ProjectsPage() {
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
    { data: projectOwners },
    { data: categories },
    { data: statuses },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", auth.user.id).single(),
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("projects").select("*").order("name"),
    supabase.from("project_owners").select("*"),
    supabase.from("work_groups").select("*").order("name"),
    supabase.from("statuses").select("*").order("sort_order"),
  ]);
  if (!currentProfile) redirect("/login?error=profile");
  if (!currentProfile.onboarding_completed) redirect("/profile");

  const initialData: WorkspaceData = {
    currentProfile,
    profiles: profiles ?? [],
    projects: projects ?? [],
    projectOwners: projectOwners ?? [],
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

  return <ProjectsPageClient initialData={initialData} demoMode={false} />;
}
