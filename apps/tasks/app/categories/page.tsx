import { redirect } from "next/navigation";
import { CategoriesPageClient } from "@/components/CategoriesPageClient";
import { demoData } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceData } from "@/lib/types";
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
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const [{ data: currentProfile }, { data: profiles }, { data: statuses }, { data: categories }, { data: projects }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", auth.user.id).single(),
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("statuses").select("*").order("sort_order"),
      supabase.from("work_groups").select("*").order("name"),
      supabase.from("projects").select("*").order("name"),
    ]);
  if (!currentProfile) redirect("/login?error=profile");
  if (!currentProfile.onboarding_completed) redirect("/profile");

  const initialData: WorkspaceData = {
    currentProfile,
    profiles: profiles ?? [],
    statuses: statuses ?? [],
    categories: categories ?? [],
    workGroups: [],
    projects: projects ?? [],
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
  return <CategoriesPageClient initialData={initialData} demoMode={false} />;
}
