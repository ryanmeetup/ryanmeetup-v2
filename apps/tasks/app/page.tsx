import type { Metadata } from "next";
import { DashboardPageClient } from "@/components/dashboard";
import {
  ACCESS_PREVIEW_PARAM,
  applyAccessPreview,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access-preview";
import { resolveAccessPreview } from "@/lib/access-preview-server";
import { demoData } from "@/lib/demo-data";
import { requireQueryData, WORKSPACE_COLUMNS } from "@/lib/workspace-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";

export const metadata: Metadata = {
  title: { absolute: "Dashboard | Ryan Meetup Tasks" },
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const requestedGroupPreview =
    typeof query[ACCESS_PREVIEW_PARAM] === "string"
      ? query[ACCESS_PREVIEW_PARAM]
      : undefined;
  const requestedUserPreview =
    typeof query[USER_ACCESS_PREVIEW_PARAM] === "string"
      ? query[USER_ACCESS_PREVIEW_PARAM]
      : undefined;
  const demoMode = isWorkspaceDemo();
  if (demoMode) return <DashboardPageClient initialData={demoData} demoMode />;

  const loaded = await loadWorkspacePage([
    "profiles",
    "statuses",
    "categories",
    "categoryOwners",
    "projects",
    "projectOwners",
  ]);
  const { supabase } = loaded;
  let initialData = loaded.data;
  const taskResult = await supabase
    .from("tasks")
    .select(WORKSPACE_COLUMNS.tasks)
    .or(`archived_at.is.null,archived_at.gt.${new Date().toISOString()}`)
    .order("updated_at", { ascending: false });
  const tasks = requireQueryData("dashboard tasks", taskResult);
  const taskIds = tasks.map((task) => task.id);
  const [assigneeResult, activityResult] = taskIds.length
    ? await Promise.all([
        supabase
          .from("task_assignees")
          .select(WORKSPACE_COLUMNS.taskAssignees)
          .in("task_id", taskIds),
        supabase
          .from("task_activity")
          .select(WORKSPACE_COLUMNS.activity)
          .in("task_id", taskIds)
          .eq("action", "moved task")
          .order("created_at", { ascending: false })
          .limit(20),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  initialData = {
    ...initialData,
    tasks,
    taskAssignees: requireQueryData("dashboard assignees", assigneeResult),
    activity: requireQueryData("dashboard activity", activityResult),
  };

  if (requestedGroupPreview || requestedUserPreview) {
    const isOwner = requireQueryData(
      "owner access",
      await supabase.rpc("is_app_owner"),
    );
    if (isOwner) {
      const resolvedPreview = await resolveAccessPreview(supabase, {
        groupId: requestedGroupPreview,
        userName: requestedUserPreview,
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

  return <DashboardPageClient initialData={initialData} demoMode={false} />;
}
