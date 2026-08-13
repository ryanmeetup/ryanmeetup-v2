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
import { parseTaskKey } from "@/lib/task-key";

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
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const parseCategoryIds = (name: string) =>
    (params.get(name) ?? "").split(",").filter((id) => uuidPattern.test(id));
  const includedCategoryIds = parseCategoryIds("categories");
  const legacyCategory = params.get("category");
  if (legacyCategory && uuidPattern.test(legacyCategory))
    includedCategoryIds.push(legacyCategory);
  const excludedCategoryIds = parseCategoryIds("excludeCategories");
  const paginated = params.get("paginated") === "1";
  const { requestedPage, pageSize } = parsePagination(params);
  const sort = params.get("sort") === "due" ? "due" : "updated";
  const parseDueDays = (name: string) =>
    (params.get(name) ?? "")
      .split(",")
      .filter((value) => ["7", "14", "30"].includes(value))
      .map(Number);
  const dueWithinDays = Math.max(...parseDueDays("dueWithin"), 0) || null;
  const excludedDueDays =
    Math.max(...parseDueDays("excludeDueWithin"), 0) || null;
  const hasDueWithinFilter = dueWithinDays !== null;
  const today = new Date();
  const dueBoundary = new Date(
    today.getTime() + (dueWithinDays ?? 0) * 86_400_000,
  );
  const excludedDueBoundary = new Date(
    today.getTime() + (excludedDueDays ?? 0) * 86_400_000,
  );
  const dateValue = (date: Date) => date.toISOString().slice(0, 10);
  let previewProjectIds: string[] | undefined;
  let previewInaccessibleTaskIds: string[] = [];
  const requestedGroupPreview = params.get(ACCESS_PREVIEW_PARAM) ?? undefined;
  const requestedUserPreview =
    params.get(USER_ACCESS_PREVIEW_PARAM) ?? undefined;
  if (requestedGroupPreview || requestedUserPreview) {
    const { data: isOwner } = await supabase.rpc("is_app_owner");
    if (isOwner) {
      const { data: previewProjects } = await supabase
        .from("projects")
        .select("id");
      const resolved = await resolveAccessPreview(supabase, {
        groupId: requestedGroupPreview,
        userName: requestedUserPreview,
        allProjectIds: (previewProjects ?? []).map((project) => project.id),
      });
      if (resolved) {
        previewProjectIds = resolved.projectIds;
        previewInaccessibleTaskIds =
          resolved.preview.inaccessibleTaskIds ?? [];
      }
    }
  }
  const [includedRows, excludedRows] = await Promise.all([
    includedCategoryIds.length
      ? supabase
          .from("task_categories")
          .select("task_id")
          .in("category_id", includedCategoryIds)
      : Promise.resolve({ data: [], error: null }),
    excludedCategoryIds.length
      ? supabase
          .from("task_categories")
          .select("task_id")
          .in("category_id", excludedCategoryIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (includedRows.error || excludedRows.error)
    return databaseFailure(
      request,
      "tasks.category-filters",
      includedRows.error ?? excludedRows.error!,
      { error: "Category filters could not be applied. Try again." },
    );
  const includedTaskIds = [
    ...new Set((includedRows.data ?? []).map((row) => row.task_id)),
  ];
  const excludedTaskIds = [
    ...new Set((excludedRows.data ?? []).map((row) => row.task_id)),
  ];
  const rawSearch = params.get("search")?.trim() ?? "";
  const search = rawSearch.replaceAll(/[%,()]/g, "");
  const searchProjectResult = rawSearch
    ? await supabase
        .from("projects")
        .select("id")
        .ilike("name", `%${rawSearch}%`)
    : { data: [], error: null };
  if (searchProjectResult.error)
    return databaseFailure(
      request,
      "tasks.search-projects",
      searchProjectResult.error,
      { error: "Tasks could not be searched. Try again." },
    );
  const matchingProjectIds = (searchProjectResult.data ?? []).map(
    (project) => project.id,
  );

  let query = supabase
    .from("tasks")
    .select(
      WORKSPACE_COLUMNS.tasks,
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
  if (previewInaccessibleTaskIds.length)
    query = query.not(
      "id",
      "in",
      `(${previewInaccessibleTaskIds.join(",")})`,
    );

  const exactFilters = [
    ["status", "excludeStatuses", "status_id"],
    ["project", "excludeProjects", "project_id"],
    ["assignee", "excludeAssignees", "assignee_id"],
    ["reporter", "excludeReporters", "reported_by"],
    ["priority", "excludePriorities", "priority"],
  ] as const;
  for (const [includeParam, excludeParam, column] of exactFilters) {
    const included = (params.get(includeParam) ?? "")
      .split(",")
      .filter((value) => value && value !== "all");
    const excluded = (params.get(excludeParam) ?? "")
      .split(",")
      .filter(Boolean);
    const includeNull = included.some(
      (value) => value === "none" || value === "unassigned",
    );
    const excludeNull = excluded.some(
      (value) => value === "none" || value === "unassigned",
    );
    const includedValues = included.filter(
      (value) => value !== "none" && value !== "unassigned",
    );
    const excludedValues = excluded.filter(
      (value) => value !== "none" && value !== "unassigned",
    );
    if (includeNull && includedValues.length)
      query = query.or(
        `${column}.is.null,${column}.in.(${includedValues.join(",")})`,
      );
    else if (includeNull) query = query.is(column, null);
    else if (includedValues.length) query = query.in(column, includedValues);
    if (excludeNull) query = query.not(column, "is", null);
    if (excludedValues.length)
      query = query.not(column, "in", `(${excludedValues.join(",")})`);
  }
  if (hasDueWithinFilter)
    query = query
      .gte("due_date", dateValue(today))
      .lte("due_date", dateValue(dueBoundary));
  if (excludedDueDays)
    query = query.or(
      `due_date.is.null,due_date.lt.${dateValue(today)},due_date.gt.${dateValue(excludedDueBoundary)}`,
    );
  if (includedCategoryIds.length)
    query = query.in(
      "id",
      includedTaskIds.length
        ? includedTaskIds
        : ["00000000-0000-0000-0000-000000000000"],
    );
  if (excludedTaskIds.length)
    query = query.not("id", "in", `(${excludedTaskIds.join(",")})`);
  if (search) {
    const taskNumber = parseTaskKey(search);
    const searchFilters = [
      `title.ilike.%${search}%`,
      `description.ilike.%${search}%`,
      ...(taskNumber ? [`task_number.eq.${taskNumber}`] : []),
      ...(matchingProjectIds.length
        ? [`project_id.in.(${matchingProjectIds.join(",")})`]
        : []),
    ];
    query = query.or(searchFilters.join(","));
  }

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
    let corrected = supabase.from("tasks").select(WORKSPACE_COLUMNS.tasks);
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
    if (previewInaccessibleTaskIds.length)
      corrected = corrected.not(
        "id",
        "in",
        `(${previewInaccessibleTaskIds.join(",")})`,
      );
    for (const [includeParam, excludeParam, column] of exactFilters) {
      const included = (params.get(includeParam) ?? "")
        .split(",")
        .filter((value) => value && value !== "all");
      const excluded = (params.get(excludeParam) ?? "")
        .split(",")
        .filter(Boolean);
      const includeNull = included.some(
        (value) => value === "none" || value === "unassigned",
      );
      const excludeNull = excluded.some(
        (value) => value === "none" || value === "unassigned",
      );
      const includedValues = included.filter(
        (value) => value !== "none" && value !== "unassigned",
      );
      const excludedValues = excluded.filter(
        (value) => value !== "none" && value !== "unassigned",
      );
      if (includeNull && includedValues.length)
        corrected = corrected.or(
          `${column}.is.null,${column}.in.(${includedValues.join(",")})`,
        );
      else if (includeNull) corrected = corrected.is(column, null);
      else if (includedValues.length)
        corrected = corrected.in(column, includedValues);
      if (excludeNull) corrected = corrected.not(column, "is", null);
      if (excludedValues.length)
        corrected = corrected.not(
          column,
          "in",
          `(${excludedValues.join(",")})`,
        );
    }
    if (hasDueWithinFilter)
      corrected = corrected
        .gte("due_date", dateValue(today))
        .lte("due_date", dateValue(dueBoundary));
    if (excludedDueDays)
      corrected = corrected.or(
        `due_date.is.null,due_date.lt.${dateValue(today)},due_date.gt.${dateValue(excludedDueBoundary)}`,
      );
    if (includedCategoryIds.length)
      corrected = corrected.in(
        "id",
        includedTaskIds.length
          ? includedTaskIds
          : ["00000000-0000-0000-0000-000000000000"],
      );
    if (excludedTaskIds.length)
      corrected = corrected.not("id", "in", `(${excludedTaskIds.join(",")})`);
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
      : {
          page: 1,
          pageSize: tasks.length || pageSize,
          totalCount: tasks.length,
        },
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
