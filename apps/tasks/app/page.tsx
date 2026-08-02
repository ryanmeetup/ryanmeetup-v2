import { TaskApp } from "@/components/TaskApp";
import { demoData } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceData } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function Home() {
  const demoMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (demoMode) return <TaskApp initialData={demoData} demoMode />;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [
    { data: currentProfile },
    { data: profiles },
    { data: statuses },
    { data: workGroups },
    { data: categories },
    { data: projects },
    { data: tasks },
    { data: subtasks },
    { data: comments },
    { data: activity },
    { data: attachments },
    { data: labels },
    { data: taskAssignees },
    { data: taskLabels },
    { data: taskCategories },
    { data: projectOwners },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", auth.user.id).single(),
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("statuses").select("*").order("sort_order"),
    supabase.from("work_groups").select("*").order("name"),
    supabase.from("work_groups").select("*").order("name"),
    supabase.from("projects").select("*").order("name"),
    supabase
      .from("tasks")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase.from("subtasks").select("*").order("sort_order"),
    supabase.from("task_comments").select("*").order("created_at"),
    supabase
      .from("task_activity")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("task_attachments").select("*").order("created_at"),
    supabase.from("labels").select("*").order("name"),
    supabase.from("task_assignees").select("*"),
    supabase.from("task_labels").select("*"),
    supabase.from("task_categories").select("*"),
    supabase.from("project_owners").select("*"),
  ]);
  if (!currentProfile) redirect("/login?error=profile");
  const resolvedAttachments = await Promise.all(
    (attachments ?? []).map(async (attachment) => {
      if (!attachment.file_path) return attachment;
      const signed = await supabase.storage
        .from("task-attachments")
        .createSignedUrl(attachment.file_path, 60 * 60);
      return signed.data?.signedUrl
        ? { ...attachment, url: signed.data.signedUrl }
        : attachment;
    }),
  );
  const initialData: WorkspaceData = {
    currentProfile,
    profiles: profiles ?? [],
    statuses: statuses ?? [],
    workGroups: workGroups ?? [],
    categories: categories ?? [],
    projects: projects ?? [],
    tasks: tasks ?? [],
    subtasks: subtasks ?? [],
    comments: comments ?? [],
    activity: activity ?? [],
    attachments: resolvedAttachments,
    labels: labels ?? [],
    taskAssignees: taskAssignees ?? [],
    taskLabels: taskLabels ?? [],
    taskCategories: taskCategories ?? [],
    projectOwners: projectOwners ?? [],
  };
  return <TaskApp initialData={initialData} demoMode={false} />;
}
