import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { databaseFailure } from "@/lib/server/api-response";
import { derivePagination, parsePagination } from "@/lib/pagination";
import { WORKSPACE_COLUMNS } from "@/lib/workspace-loader";
import type { Task, TaskActivity } from "@/lib/types";
import {
  ACCESS_PREVIEW_PARAM,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access-preview";
import { resolveAccessPreview } from "@/lib/access-preview-server";

const DAY = 24 * 60 * 60 * 1000;

function applyActivityFilters<T extends {
  eq: (column: string, value: string) => T;
  is: (column: string, value: null) => T;
  ilike: (column: string, pattern: string) => T;
  gte: (column: string, value: string) => T;
  or: (filters: string, options?: { referencedTable?: string }) => T;
}>(query: T, params: URLSearchParams, previewProjectIds?: string[]) {
  if (previewProjectIds) {
    const projectFilter = previewProjectIds.length
      ? `project_id.is.null,project_id.in.(${previewProjectIds.join(",")})`
      : "project_id.is.null";
    query = query.or(projectFilter, { referencedTable: "tasks" });
  }
  const project = params.get("project");
  if (project === "none") query = query.is("tasks.project_id", null);
  else if (project && project !== "all")
    query = query.eq("tasks.project_id", project);

  const person = params.get("person");
  if (person === "system") query = query.is("actor_id", null);
  else if (person && person !== "all") query = query.eq("actor_id", person);

  const event = params.get("event");
  if (event === "created") query = query.eq("action", "created the task");
  else if (event === "updated") query = query.eq("action", "updated the task");
  else if (event === "moved") query = query.eq("action", "moved task");
  else if (event === "checklist") query = query.ilike("action", "%checklist%");
  else if (event === "attachment") query = query.ilike("action", "%attach%");

  const when = params.get("when");
  const windowMs =
    when === "day" ? DAY : when === "week" ? 7 * DAY : when === "month" ? 30 * DAY : null;
  if (windowMs)
    query = query.gte("created_at", new Date(Date.now() - windowMs).toISOString());
  return query;
}

export async function GET(request: Request) {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const params = new URL(request.url).searchParams;
  const { requestedPage, pageSize } = parsePagination(params);
  const selection = `${WORKSPACE_COLUMNS.activity},tasks!inner(${WORKSPACE_COLUMNS.tasks})`;
  let previewProjectIds: string[] | undefined;
  const requestedGroupPreview = params.get(ACCESS_PREVIEW_PARAM) ?? undefined;
  const requestedUserPreview = params.get(USER_ACCESS_PREVIEW_PARAM) ?? undefined;
  if (requestedGroupPreview || requestedUserPreview) {
    const { data: isOwner } = await authorization.supabase.rpc("is_app_owner");
    if (isOwner) {
      const { data: projects, error: projectsError } = await authorization.supabase
        .from("projects")
        .select("id");
      if (projectsError)
        return databaseFailure(request, "activity.preview-projects", projectsError, {
          error: "Activity could not be loaded. Try again.",
        });
      const resolved = await resolveAccessPreview(authorization.supabase, {
        groupId: requestedGroupPreview,
        userId: requestedUserPreview,
        allProjectIds: (projects ?? []).map((project) => project.id),
      });
      if (resolved) previewProjectIds = resolved.projectIds;
    }
  }

  let countQuery = authorization.supabase
    .from("task_activity")
    .select(selection, { count: "exact", head: true });
  countQuery = applyActivityFilters(countQuery, params, previewProjectIds);
  const countResult = await countQuery;
  if (countResult.error)
    return databaseFailure(request, "activity.count", countResult.error, {
      error: "Activity could not be loaded. Try again.",
    });

  const page = derivePagination(requestedPage, pageSize, countResult.count ?? 0);
  let itemQuery = authorization.supabase
    .from("task_activity")
    .select(selection);
  itemQuery = applyActivityFilters(itemQuery, params, previewProjectIds);
  const result = await itemQuery
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(page.from, page.to);
  if (result.error)
    return databaseFailure(request, "activity.list", result.error, {
      error: "Activity could not be loaded. Try again.",
    });

  const rows = (result.data ?? []) as unknown as Array<
    TaskActivity & { tasks: Task }
  >;
  const tasks = [...new Map(rows.map((row) => [row.tasks.id, row.tasks])).values()];
  const activity = rows.map(({ tasks: relatedTask, ...item }) => {
    void relatedTask;
    return item;
  });
  return NextResponse.json({
    activity,
    tasks,
    page: {
      page: page.page,
      pageSize: page.pageSize,
      totalCount: page.totalCount,
    },
  });
}
