import { redirect } from "next/navigation";
import { ProfilePageClient } from "@/components/profile";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const demoMode = isWorkspaceDemo();
  if (demoMode) redirect("/");
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
}
