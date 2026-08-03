import { TaskApp } from "@/components/TaskApp";
import {
  ACCESS_PREVIEW_PARAM,
  applyAccessPreview,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access-preview";
import { resolveAccessPreview } from "@/lib/access-preview-server";
import { demoData } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceData } from "@/lib/types";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Task board",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const initialTaskOpen = query["new-task"] === "1";
  const requestedGroupPreview =
    typeof query[ACCESS_PREVIEW_PARAM] === "string"
      ? query[ACCESS_PREVIEW_PARAM]
      : undefined;
  const requestedUserPreview =
    typeof query[USER_ACCESS_PREVIEW_PARAM] === "string"
      ? query[USER_ACCESS_PREVIEW_PARAM]
      : undefined;
  const demoMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (demoMode)
    return (
      <TaskApp
        initialData={demoData}
        demoMode
        initialTaskOpen={initialTaskOpen}
      />
    );

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .single();
  if (!currentProfile) redirect("/login?error=profile");
  if (!currentProfile.onboarding_completed) redirect("/profile");

  const [
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
  ] = await Promise.all([
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
  ]);
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
  let initialData: WorkspaceData = {
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
    projectOwners: [],
  };
  if (requestedGroupPreview || requestedUserPreview) {
    const { data: isOwner } = await supabase.rpc("is_app_owner");
    if (isOwner) {
      const resolvedPreview = await resolveAccessPreview(supabase, {
        groupId: requestedGroupPreview,
        userId: requestedUserPreview,
        allProjectIds: initialData.projects.map((project) => project.id),
      });
      if (resolvedPreview) {
        initialData = applyAccessPreview(
          initialData,
          resolvedPreview.preview,
          resolvedPreview.projectIds,
        );
      }
    }
  }
  return (
    <TaskApp
      initialData={initialData}
      demoMode={false}
      initialTaskOpen={initialTaskOpen}
    />
  );
}
