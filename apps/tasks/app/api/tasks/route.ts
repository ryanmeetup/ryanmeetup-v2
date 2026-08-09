import { NextResponse } from "next/server";
import { idSchema, taskMoveSchema, taskSaveSchema } from "@/lib/api-schemas";
import { databaseFailure } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import { readJson } from "@/lib/server/request";
import { WORKSPACE_COLUMNS } from "@/lib/workspace-loader";
import { derivePagination, parsePagination } from "@/lib/pagination";
import type { Task, TaskAssignee, TaskCategory } from "@/lib/types";
import {
  ACCESS_PREVIEW_PARAM,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access-preview";
import { resolveAccessPreview } from "@/lib/access-preview-server";

type SavedTask = {
  task: Task;
  assignees: TaskAssignee[];
  categories: TaskCategory[];
};

export async function GET(request: Request): Promise<NextResponse> {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const { supabase } = authorization;

  const params = new URL(request.url).searchParams;
  const visibility =
    params.get("visibility") === "archived" ? "archived" : "active";
  const boundary = new Date().toISOString();
  const category = params.get("category");
  const paginated = params.get("paginated") === "1";
  const { requestedPage, pageSize } = parsePagination(params);
  const sort = params.get("sort") === "due" ? "due" : "updated";
  let previewProjectIds: string[] | undefined;
  const requestedGroupPreview = params.get(ACCESS_PREVIEW_PARAM) ?? undefined;
  const requestedUserPreview = params.get(USER_ACCESS_PREVIEW_PARAM) ?? undefined;
  if (requestedGroupPreview || requestedUserPreview) {
    const { data: isOwner } = await supabase.rpc("is_app_owner");
    if (isOwner) {
      const { data: previewProjects } = await supabase.from("projects").select("id");
      const resolved = await resolveAccessPreview(supabase, {
        groupId: requestedGroupPreview,
        userId: requestedUserPreview,
        allProjectIds: (previewProjects ?? []).map((project) => project.id),
      });
      if (resolved) previewProjectIds = resolved.projectIds;
    }
  }
  let query = supabase
    .from("tasks")
    .select(
      category && category !== "all"
        ? `${WORKSPACE_COLUMNS.tasks},task_categories!inner(category_id)`
        : WORKSPACE_COLUMNS.tasks,
      paginated ? { count: "exact" } : undefined,
    );
  query =
    visibility === "archived"
      ? query.lte("archived_at", boundary)
      : query.or(`archived_at.is.null,archived_at.gt.${boundary}`);
  if (previewProjectIds) {
    query = query.or(
      previewProjectIds.length
        ? `project_id.is.null,project_id.in.(${previewProjectIds.join(",")})`
        : "project_id.is.null",
    );
  }

  const exactFilters = [
    ["status", "status_id"],
    ["project", "project_id"],
    ["assignee", "assignee_id"],
    ["priority", "priority"],
  ] as const;
  for (const [param, column] of exactFilters) {
    const value = params.get(param);
    if (value === "none" || value === "unassigned")
      query = query.is(column, null);
    else if (value && value !== "all") query = query.eq(column, value);
  }
  if (category && category !== "all")
    query = query.eq("task_categories.category_id", category);
  const search = params
    .get("search")
    ?.trim()
    .replaceAll(/[%,()]/g, "");
  if (search)
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

  query =
    sort === "due"
      ? query
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("id", { ascending: true })
      : query
          .order("updated_at", { ascending: false })
          .order("id", { ascending: false });
  if (paginated) {
    const requestedFrom = (requestedPage - 1) * pageSize;
    query = query.range(requestedFrom, requestedFrom + pageSize - 1);
  }
  let result = await query;
  if (result.error)
    return databaseFailure(request, "tasks.list", result.error, {
      error: "Tasks could not be loaded. Try again.",
    });

  let totalCount = paginated ? (result.count ?? 0) : (result.data?.length ?? 0);
  const pageState = derivePagination(requestedPage, pageSize, totalCount);
  if (paginated && pageState.page !== requestedPage && totalCount > 0) {
    let corrected = supabase
      .from("tasks")
      .select(
        category && category !== "all"
          ? `${WORKSPACE_COLUMNS.tasks},task_categories!inner(category_id)`
          : WORKSPACE_COLUMNS.tasks,
      );
    corrected =
      visibility === "archived"
        ? corrected.lte("archived_at", boundary)
        : corrected.or(`archived_at.is.null,archived_at.gt.${boundary}`);
    if (previewProjectIds) {
      corrected = corrected.or(
        previewProjectIds.length
          ? `project_id.is.null,project_id.in.(${previewProjectIds.join(",")})`
          : "project_id.is.null",
      );
    }
    for (const [param, column] of exactFilters) {
      const value = params.get(param);
      if (value === "none" || value === "unassigned")
        corrected = corrected.is(column, null);
      else if (value && value !== "all") corrected = corrected.eq(column, value);
    }
    if (category && category !== "all")
      corrected = corrected.eq("task_categories.category_id", category);
    if (search)
      corrected = corrected.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`,
      );
    corrected =
      sort === "due"
        ? corrected
            .order("due_date", { ascending: true, nullsFirst: false })
            .order("id", { ascending: true })
        : corrected
            .order("updated_at", { ascending: false })
            .order("id", { ascending: false });
    result = await corrected.range(pageState.from, pageState.to);
    if (result.error)
      return databaseFailure(request, "tasks.list", result.error, {
        error: "Tasks could not be loaded. Try again.",
      });
    totalCount = pageState.totalCount;
  }
  const tasks = (result.data ?? []) as unknown as Task[];
  const taskIds = tasks.map((task) => task.id);
  const [categories, assignees, labels] = taskIds.length
    ? await Promise.all([
        supabase
          .from("task_categories")
          .select(WORKSPACE_COLUMNS.taskCategories)
          .in("task_id", taskIds),
        supabase
          .from("task_assignees")
          .select(WORKSPACE_COLUMNS.taskAssignees)
          .in("task_id", taskIds),
        supabase
          .from("task_labels")
          .select(WORKSPACE_COLUMNS.taskLabels)
          .in("task_id", taskIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  return NextResponse.json({
    tasks,
    taskCategories: categories.data ?? [],
    taskAssignees: assignees.data ?? [],
    taskLabels: labels.data ?? [],
    page: paginated
      ? {
          page: pageState.page,
          pageSize: pageState.pageSize,
          totalCount,
        }
      : { page: 1, pageSize: tasks.length || pageSize, totalCount: tasks.length },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = await readJson(request, taskSaveSchema);
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const { id, task, categoryIds } = parsed.data;
  const { data, error } = await authorization.supabase.rpc("save_task", {
    task_id: id,
    task_values: task,
    category_ids: categoryIds,
    assignee_ids: task.assignee_id ? [task.assignee_id] : [],
  });
  if (error)
    return databaseFailure(request, "task.save", error, {
      error: "The task could not be saved. Try again.",
      conflictError:
        "This task conflicts with a recent change. Refresh and try again.",
    });
  return NextResponse.json(data as SavedTask);
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const parsed = await readJson(request, taskMoveSchema);
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const { data, error } = await authorization.supabase.rpc("move_task", {
    moved_task_id: parsed.data.id,
    next_status_id: parsed.data.statusId,
    next_board_position: parsed.data.boardPosition,
  });
  if (error)
    return databaseFailure(request, "task.move", error, {
      error: "The task could not be moved. Refresh and try again.",
    });
  return NextResponse.json({ task: data as Task });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const parsed = await readJson(request, idSchema);
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const { data, error } = await authorization.supabase.rpc("delete_task", {
    deleted_task_id: parsed.data.id,
  });
  if (error)
    return databaseFailure(request, "task.delete", error, {
      error: "The task could not be deleted. Try again.",
    });
  return NextResponse.json({ id: data as string });
}
