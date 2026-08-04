import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Priority, Task, TaskAssignee, TaskCategory } from "@/lib/types";

type TaskInput = Pick<
  Task,
  | "title"
  | "description"
  | "status_id"
  | "work_group_id"
  | "project_id"
  | "assignee_id"
  | "start_date"
  | "due_date"
  | "due_time"
  | "reminder_at"
  | "priority"
>;
type SavedTask = {
  task: Task;
  assignees: TaskAssignee[];
  categories: TaskCategory[];
};
const priorities: Priority[] = ["low", "medium", "high", "urgent"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const body = (await request.json()) as {
    id?: unknown;
    task?: Partial<TaskInput>;
    categoryIds?: unknown;
  };
  const task = body.task;
  if (
    !task ||
    typeof task.title !== "string" ||
    !task.title.trim() ||
    typeof task.status_id !== "string" ||
    !priorities.includes(task.priority as Priority) ||
    !Array.isArray(body.categoryIds) ||
    body.categoryIds.length === 0 ||
    body.categoryIds.some((id) => typeof id !== "string")
  ) {
    return NextResponse.json(
      { error: "Add a title, status, priority, and at least one category." },
      { status: 400 },
    );
  }
  const { data, error } = await supabase.rpc("save_task", {
    task_id: typeof body.id === "string" ? body.id : null,
    task_values: { ...task, title: task.title.trim() },
    category_ids: [...new Set(body.categoryIds as string[])],
    assignee_ids: task.assignee_id ? [task.assignee_id] : [],
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data as SavedTask);
}
