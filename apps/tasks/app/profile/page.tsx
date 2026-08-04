import { redirect } from "next/navigation";
import { ProfilePageClient } from "@/components/profile";
import { createClient } from "@/lib/supabase/server";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import { WorkspaceLoadError } from "@/lib/workspace-loader";
import type { WorkspaceData } from "@/lib/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const demoMode = isWorkspaceDemo();
  if (demoMode) redirect("/");

  try {
    const { data: initialData, user } = await loadWorkspacePage(
      ["profiles", "statuses", "categories", "projects"],
      { requireOnboarding: false },
    );
    return (
      <ProfilePageClient
        initialData={initialData}
        email={user.email ?? ""}
        onboardingRequired={!initialData.currentProfile.onboarding_completed}
      />
    );
  } catch (error) {
    if (!(error instanceof WorkspaceLoadError)) throw error;

    // Fallback: load only the user's own profile (always readable via RLS).
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) redirect("/login");
    const { data: profile } = await supabase
      .from("profiles")
      .select("id,full_name,avatar_url,onboarding_completed,task_details_open_by_default,app_role")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (!profile) redirect("/login?error=profile");

    const fallbackData: WorkspaceData = {
      currentProfile: profile,
      profiles: [profile],
      statuses: [],
      categories: [],
      projects: [],
      projectOwners: [],
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
        initialData={fallbackData}
        email={auth.user.email ?? ""}
        onboardingRequired={!profile.onboarding_completed}
      />
    );
  }
}
