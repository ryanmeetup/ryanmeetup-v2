import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TASK_PAGE_SIZE, WORKSPACE_COLUMNS } from "@/lib/workspace-loader";
import type { Priority, Task, TaskAssignee, TaskCategory } from "@/lib/types";

type TaskInput = Pick<Task, "title" | "description" | "status_id" | "work_group_id" | "project_id" | "assignee_id" | "start_date" | "due_date" | "due_time" | "reminder_at" | "priority">;
type SavedTask = { task: Task; assignees: TaskAssignee[]; categories: TaskCategory[] };
const priorities: Priority[] = ["low", "medium", "high", "urgent"];

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const page = Math.max(0, Number.parseInt(params.get("page") ?? "0", 10) || 0);
  const visibility = params.get("visibility") === "archived" ? "archived" : "active";
  const boundary = new Date().toISOString();
  const category = params.get("category");
  let query = supabase
    .from("tasks")
    .select(category && category !== "all" ? `${WORKSPACE_COLUMNS.tasks},task_categories!inner(category_id)` : WORKSPACE_COLUMNS.tasks, { count: "exact" });
  query = visibility === "archived"
    ? query.lte("archived_at", boundary)
    : query.or(`archived_at.is.null,archived_at.gt.${boundary}`);

  const exactFilters = [
    ["status", "status_id"],
    ["project", "project_id"],
    ["assignee", "assignee_id"],
    ["priority", "priority"],
  ] as const;
  for (const [param, column] of exactFilters) {
    const value = params.get(param);
    if (value === "none" || value === "unassigned") query = query.is(column, null);
    else if (value && value !== "all") query = query.eq(column, value);
  }
  if (category && category !== "all") query = query.eq("task_categories.category_id", category);
  const search = params.get("search")?.trim().replaceAll(/[%,()]/g, "");
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

  const from = page * TASK_PAGE_SIZE;
  const result = await query
    .order("updated_at", { ascending: false })
    .range(from, from + TASK_PAGE_SIZE - 1);
  if (result.error)
    return NextResponse.json({ error: result.error.message }, { status: 400 });

  // The selected relation is conditional, which Supabase's string parser cannot
  // represent as one inferred row type. Both branches retain the task columns.
  const tasks = (result.data ?? []) as unknown as Task[];
  const taskIds = tasks.map((task) => task.id);
  const [categories, assignees, labels] = taskIds.length
    ? await Promise.all([
        supabase.from("task_categories").select(WORKSPACE_COLUMNS.taskCategories).in("task_id", taskIds),
        supabase.from("task_assignees").select(WORKSPACE_COLUMNS.taskAssignees).in("task_id", taskIds),
        supabase.from("task_labels").select(WORKSPACE_COLUMNS.taskLabels).in("task_id", taskIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  return NextResponse.json({
    tasks,
    taskCategories: categories.data ?? [],
    taskAssignees: assignees.data ?? [],
    taskLabels: labels.data ?? [],
    page: { page, pageSize: TASK_PAGE_SIZE, total: result.count ?? tasks.length, hasMore: from + tasks.length < (result.count ?? 0) },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const body = (await request.json()) as { id?: unknown; task?: Partial<TaskInput>; categoryIds?: unknown };
  const task = body.task;
  if (!task || typeof task.title !== "string" || !task.title.trim() || typeof task.status_id !== "string" || !priorities.includes(task.priority as Priority) || !Array.isArray(body.categoryIds) || body.categoryIds.length === 0 || body.categoryIds.some((id) => typeof id !== "string"))
    return NextResponse.json({ error: "Add a title, status, priority, and at least one category." }, { status: 400 });
  const { data, error } = await supabase.rpc("save_task", { task_id: typeof body.id === "string" ? body.id : null, task_values: { ...task, title: task.title.trim() }, category_ids: [...new Set(body.categoryIds as string[])], assignee_ids: task.assignee_id ? [task.assignee_id] : [] });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data as SavedTask);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const body = (await request.json()) as { id?: unknown; statusId?: unknown; boardPosition?: unknown };
  if (typeof body.id !== "string" || typeof body.statusId !== "string" || typeof body.boardPosition !== "number" || !Number.isFinite(body.boardPosition))
    return NextResponse.json({ error: "Invalid task move." }, { status: 400 });
  const { data, error } = await supabase.rpc("move_task", { moved_task_id: body.id, next_status_id: body.statusId, next_board_position: body.boardPosition });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ task: data as Task });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const body = (await request.json()) as { id?: unknown };
  if (typeof body.id !== "string") return NextResponse.json({ error: "Invalid task." }, { status: 400 });
  const { data, error } = await supabase.rpc("delete_task", { deleted_task_id: body.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data as string });
}
