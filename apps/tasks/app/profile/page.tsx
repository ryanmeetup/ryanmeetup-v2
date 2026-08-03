import { redirect } from "next/navigation";
import { ProfilePageClient } from "@/components/ProfilePageClient";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceData } from "@/lib/types";

export default async function ProfilePage() {
  const demoMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (demoMode) redirect("/");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const [
    { data: profile, error },
    { data: profiles },
    { data: statuses },
    { data: categories },
    { data: projects },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", auth.user.id).single(),
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("statuses").select("*").order("sort_order"),
    supabase.from("work_groups").select("*").order("name"),
    supabase.from("projects").select("*").order("name"),
  ]);
  if (error) throw error;
  if (!profile) redirect("/?error=profile");
  const initialData: WorkspaceData = {
    currentProfile: profile,
    profiles: profiles ?? [],
    statuses: statuses ?? [],
    categories: categories ?? [],
    projects: projects ?? [],
    projectOwners: [],
    workGroups: [],
    tasks: [],
    subtasks: [],
    comments: [],
    activity: [],
    attachments: [],
    labels: [],
    taskAssignees: [],
    taskLabels: [],
    taskCategories: [],
  };
  return (
    <ProfilePageClient
      initialData={initialData}
      email={auth.user.email ?? ""}
      onboardingRequired={!profile.onboarding_completed}
    />
  );
}
