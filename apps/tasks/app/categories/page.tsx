import { redirect } from "next/navigation";
import { CategoriesPageClient } from "@/components/CategoriesPageClient";
import { demoData } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { loadWorkspace, requireQueryData } from "@/lib/workspace-loader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Work Groups",
};

export default async function CategoriesPage() {
  const demoMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (demoMode) return <CategoriesPageClient initialData={demoData} demoMode />;

  const supabase = await createClient();
  const auth = requireQueryData("authenticated user", await supabase.auth.getUser());
  if (!auth.user) redirect("/login");
  const initialData = await loadWorkspace(supabase, auth.user.id, [
    "profiles", "statuses", "categories", "projects",
  ]);
  if (!initialData) redirect("/login?error=profile");
  if (!initialData.currentProfile.onboarding_completed) redirect("/profile");
  return <CategoriesPageClient initialData={initialData} demoMode={false} />;
}
