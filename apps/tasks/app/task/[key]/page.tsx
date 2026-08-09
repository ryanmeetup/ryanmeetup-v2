import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TaskPageClient } from "@/components/tasks/TaskPageClient";
import {
  ACCESS_PREVIEW_PARAM,
  applyAccessPreview,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access-preview";
import { resolveAccessPreview } from "@/lib/access-preview-server";
import { demoData } from "@/lib/demo-data";
import { parseTaskKey, taskKey } from "@/lib/task-key";
import { requireQueryData, WORKSPACE_COLUMNS } from "@/lib/workspace-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const taskNumber = parseTaskKey(key);
  if (taskNumber === null) return {};

  if (isWorkspaceDemo()) {
    const task = demoData.tasks.find((item) => item.task_number === taskNumber);
    return task
      ? {
          title: {
            absolute: `${taskKey(task)}: ${task.title} | Ryan Meetup Tasks`,
          },
        }
      : {};
  }

  const { supabase } = await loadWorkspacePage([]);
  const task = requireQueryData(
    "task metadata",
    await supabase
      .from("tasks")
      .select("task_number,title")
      .eq("task_number", taskNumber),
  )[0];

  return task
    ? {
        title: {
          absolute: `${taskKey(task)}: ${task.title} | Ryan Meetup Tasks`,
        },
      }
    : {};
}

export default async function SharedTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { key } = await params;
  const query = await searchParams;
  const taskNumber = parseTaskKey(key);
  if (taskNumber === null) notFound();

  if (isWorkspaceDemo()) {
    const task = demoData.tasks.find((item) => item.task_number === taskNumber);
    if (!task) notFound();
    return <TaskPageClient initialData={demoData} taskId={task.id} demoMode />;
  }

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
  const task = requireQueryData(
    "shared task",
    await supabase
      .from("tasks")
      .select(WORKSPACE_COLUMNS.tasks)
      .eq("task_number", taskNumber),
  )[0];
  if (!task) notFound();

  const [assignees, categories, labels] = await Promise.all([
    supabase
      .from("task_assignees")
      .select(WORKSPACE_COLUMNS.taskAssignees)
      .eq("task_id", task.id),
    supabase
      .from("task_categories")
      .select(WORKSPACE_COLUMNS.taskCategories)
      .eq("task_id", task.id),
    supabase
      .from("task_labels")
      .select(WORKSPACE_COLUMNS.taskLabels)
      .eq("task_id", task.id),
  ]);
  initialData = {
    ...initialData,
    tasks: [task],
    taskAssignees: requireQueryData("shared task assignees", assignees),
    taskCategories: requireQueryData("shared task categories", categories),
    taskLabels: requireQueryData("shared task labels", labels),
  };

  const requestedGroupPreview =
    typeof query[ACCESS_PREVIEW_PARAM] === "string"
      ? query[ACCESS_PREVIEW_PARAM]
      : undefined;
  const requestedUserPreview =
    typeof query[USER_ACCESS_PREVIEW_PARAM] === "string"
      ? query[USER_ACCESS_PREVIEW_PARAM]
      : undefined;
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

  if (!initialData.tasks.some((item) => item.id === task.id)) notFound();
  return (
    <TaskPageClient
      initialData={initialData}
      taskId={task.id}
      demoMode={false}
    />
  );
}
