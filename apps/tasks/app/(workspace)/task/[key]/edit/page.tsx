import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditTaskPageClient } from "@/components/tasks";
import {
  EDITOR_COLLECTIONS,
  redirectAccessPreviewAway,
} from "@/lib/server/editor-page-loader";
import { demoData } from "@/lib/workspace/demo-data";
import { parseTaskKey, taskKey } from "@/lib/tasks/task-key";
import {
  requireQueryData,
  WORKSPACE_COLUMNS,
} from "@/lib/server/workspace-loader";
import {
  isWorkspaceDemo,
  loadWorkspacePage,
} from "@/lib/server/workspace-page-loader";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const taskNumber = parseTaskKey(key);
  if (taskNumber === null) return {};

  if (await isWorkspaceDemo()) {
    const task = demoData.tasks.find((item) => item.task_number === taskNumber);
    return task
      ? { title: { absolute: await pageTitle(`Edit ${taskKey(task)}`) } }
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
    ? { title: { absolute: await pageTitle(`Edit ${taskKey(task)}`) } }
    : {};
}

/**
 * The mobile edit route. `/task/[key]` keeps the read view and its dialog for
 * desktop; this renders the same form as a page.
 */
export default async function EditTaskPage({
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
  redirectAccessPreviewAway(query, `/task/${key}`);

  if (await isWorkspaceDemo()) {
    const task = demoData.tasks.find((item) => item.task_number === taskNumber);
    if (!task) notFound();
    return <EditTaskPageClient initialData={demoData} taskId={task.id} demoMode />;
  }

  const loaded = await loadWorkspacePage([...EDITOR_COLLECTIONS]);
  const { supabase } = loaded;
  const task = requireQueryData(
    "edited task",
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

  return (
    <EditTaskPageClient
      initialData={{
        ...loaded.data,
        tasks: [task],
        taskAssignees: requireQueryData("edited task assignees", assignees),
        taskCategories: requireQueryData("edited task categories", categories),
        taskLabels: requireQueryData("edited task labels", labels),
      }}
      taskId={task.id}
      demoMode={false}
    />
  );
}
