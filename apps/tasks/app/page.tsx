import { TaskApp } from "@/components/TaskApp";
import {
  ACCESS_PREVIEW_PARAM,
  applyAccessPreview,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access-preview";
import { resolveAccessPreview } from "@/lib/access-preview-server";
import { demoData } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { loadWorkspace, requireQueryData, TASK_PAGE_SIZE, WORKSPACE_COLUMNS } from "@/lib/workspace-loader";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Task Board",
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
  const auth = requireQueryData("authenticated user", await supabase.auth.getUser());
  if (!auth.user) redirect("/login");
  let initialData = await loadWorkspace(supabase, auth.user.id, [
    "profiles", "statuses", "workGroups", "categories", "projects",
    "labels",
  ]);
  if (!initialData) redirect("/login?error=profile");
  if (!initialData.currentProfile.onboarding_completed) redirect("/profile");
  const archiveBoundary = new Date().toISOString();
  const taskResult = await supabase
    .from("tasks")
    .select(WORKSPACE_COLUMNS.tasks, { count: "exact" })
    .or(`archived_at.is.null,archived_at.gt.${archiveBoundary}`)
    .order("updated_at", { ascending: false })
    .range(0, TASK_PAGE_SIZE - 1);
  const tasks = requireQueryData("active tasks", taskResult);
  const taskIds = tasks.map((task) => task.id);
  const [assigneeResult, categoryResult, labelResult] = taskIds.length
    ? await Promise.all([
        supabase.from("task_assignees").select(WORKSPACE_COLUMNS.taskAssignees).in("task_id", taskIds),
        supabase.from("task_categories").select(WORKSPACE_COLUMNS.taskCategories).in("task_id", taskIds),
        supabase.from("task_labels").select(WORKSPACE_COLUMNS.taskLabels).in("task_id", taskIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  initialData = {
    ...initialData,
    tasks,
    taskAssignees: requireQueryData("task assignees", assigneeResult),
    taskCategories: requireQueryData("task categories", categoryResult),
    taskLabels: requireQueryData("task labels", labelResult),
    taskPage: { page: 0, pageSize: TASK_PAGE_SIZE, total: taskResult.count ?? tasks.length, hasMore: tasks.length < (taskResult.count ?? 0) },
  };
  if (requestedGroupPreview || requestedUserPreview) {
    const isOwner = requireQueryData("owner access", await supabase.rpc("is_app_owner"));
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
        initialData = {
          ...initialData,
          taskPage: {
            page: 0,
            pageSize: TASK_PAGE_SIZE,
            total: initialData.tasks.length,
            hasMore: false,
          },
        };
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
