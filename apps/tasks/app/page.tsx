import { TaskApp } from "@/components/TaskApp";
import { demoData } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceData } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function Home() {
  const demoMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (demoMode) return <TaskApp initialData={demoData} demoMode />;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [
    { data: currentProfile },
    { data: profiles },
    { data: statuses },
    { data: workGroups },
    { data: tasks },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", auth.user.id).single(),
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("statuses").select("*").order("sort_order"),
    supabase.from("work_groups").select("*").order("name"),
    supabase
      .from("tasks")
      .select("*")
      .order("updated_at", { ascending: false }),
  ]);
  if (!currentProfile) redirect("/login?error=profile");
  const initialData: WorkspaceData = {
    currentProfile,
    profiles: profiles ?? [],
    statuses: statuses ?? [],
    workGroups: workGroups ?? [],
    tasks: tasks ?? [],
  };
  return <TaskApp initialData={initialData} demoMode={false} />;
}
