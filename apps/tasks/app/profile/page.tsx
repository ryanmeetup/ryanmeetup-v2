import { redirect } from "next/navigation";
import { ProfilePageClient } from "@/components/ProfilePageClient";
import { createClient } from "@/lib/supabase/server";
import { loadWorkspace, requireQueryData } from "@/lib/workspace-loader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const demoMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (demoMode) redirect("/");
  const supabase = await createClient();
  const auth = requireQueryData("authenticated user", await supabase.auth.getUser());
  if (!auth.user) redirect("/login");
  const initialData = await loadWorkspace(supabase, auth.user.id, [
    "profiles", "statuses", "categories", "projects",
  ]);
  if (!initialData) redirect("/?error=profile");
  return (
    <ProfilePageClient
      initialData={initialData}
      email={auth.user.email ?? ""}
      onboardingRequired={!initialData.currentProfile.onboarding_completed}
    />
  );
}
