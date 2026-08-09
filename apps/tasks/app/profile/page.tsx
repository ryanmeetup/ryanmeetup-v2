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
  title: { absolute: "Profile | Ryan Meetup Tasks" },
};

export default async function ProfilePage() {
  const demoMode = isWorkspaceDemo();
  if (demoMode) redirect("/");

  let data: WorkspaceData;
  let email: string;

  try {
    const result = await loadWorkspacePage(
      ["profiles", "statuses", "categories", "projects"],
      { requireOnboarding: false },
    );
    data = result.data;
    email = result.user.email ?? "";
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

    data = {
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
    email = auth.user.email ?? "";
  }

  return (
    <ProfilePageClient
      initialData={data}
      email={email}
      onboardingRequired={!data.currentProfile.onboarding_completed}
    />
  );
}
