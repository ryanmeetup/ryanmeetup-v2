import { TaskApp } from "@/components/tasks";
import {
  ACCESS_PREVIEW_PARAM,
  applyAccessPreview,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access-preview";
import { resolveAccessPreview } from "@/lib/access-preview-server";
import { demoData } from "@/lib/demo-data";
import {
  requireQueryData,
  WORKSPACE_COLUMNS,
} from "@/lib/workspace-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import type { Metadata } from "next";

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
  const demoMode = isWorkspaceDemo();
  if (demoMode)
    return (
      <TaskApp
        initialData={demoData}
        demoMode
        initialTaskOpen={initialTaskOpen}
      />
    );

  const loaded = await loadWorkspacePage([
    "profiles",
    "statuses",
    "categories",
    "projects",
    "projectOwners",
    "labels",
  ]);
  const { supabase } = loaded;
  let initialData = loaded.data;
  const archiveBoundary = new Date().toISOString();
  const taskResult = await supabase
    .from("tasks")
    .select(WORKSPACE_COLUMNS.tasks)
    .or(`archived_at.is.null,archived_at.gt.${archiveBoundary}`)
    .order("updated_at", { ascending: false });
  const tasks = requireQueryData("active tasks", taskResult);
  const taskIds = tasks.map((task) => task.id);
  const [assigneeResult, categoryResult, labelResult] = taskIds.length
    ? await Promise.all([
        supabase
          .from("task_assignees")
          .select(WORKSPACE_COLUMNS.taskAssignees)
          .in("task_id", taskIds),
        supabase
          .from("task_categories")
          .select(WORKSPACE_COLUMNS.taskCategories)
          .in("task_id", taskIds),
        supabase
          .from("task_labels")
          .select(WORKSPACE_COLUMNS.taskLabels)
          .in("task_id", taskIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];
  initialData = {
    ...initialData,
    tasks,
    taskAssignees: requireQueryData("task assignees", assigneeResult),
    taskCategories: requireQueryData("task categories", categoryResult),
    taskLabels: requireQueryData("task labels", labelResult),
  };
  if (requestedGroupPreview || requestedUserPreview) {
    const isOwner = requireQueryData(
      "owner access",
      await supabase.rpc("is_app_owner"),
    );
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
