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

function applyActivityFilters<
  T extends {
    eq: (column: string, value: string) => T;
    in: (column: string, values: string[]) => T;
    is: (column: string, value: null) => T;
    ilike: (column: string, pattern: string) => T;
    not: (column: string, operator: string, value: string | null) => T;
    gte: (column: string, value: string) => T;
    or: (filters: string, options?: { referencedTable?: string }) => T;
  },
>(
  query: T,
  params: URLSearchParams,
  previewProjectIds?: string[],
  previewInaccessibleTaskIds: string[] = [],
) {
  const values = (name: string, legacyName?: string) =>
    (params.get(name) ?? (legacyName ? params.get(legacyName) : null) ?? "")
      .split(",")
      .filter(Boolean);
  if (previewProjectIds) {
    const projectFilter = previewProjectIds.length
      ? `project_id.is.null,project_id.in.(${previewProjectIds.join(",")})`
      : "project_id.is.null";
    query = query.or(projectFilter, { referencedTable: "tasks" });
  }
  if (previewInaccessibleTaskIds.length)
    query = query.not(
      "tasks.id",
      "in",
      `(${previewInaccessibleTaskIds.join(",")})`,
    );
  const projects = values("projects", "project").filter(
    (value) => value !== "all",
  );
  const excludedProjects = values("excludeProjects");
  const projectIds = projects.filter((value) => value !== "none");
  if (projects.includes("none")) {
    const filter = projectIds.length
      ? `project_id.is.null,project_id.in.(${projectIds.join(",")})`
      : "project_id.is.null";
    query = query.or(filter, { referencedTable: "tasks" });
  } else if (projectIds.length)
    query = query.in("tasks.project_id", projectIds);
  if (excludedProjects.includes("none"))
    query = query.not("tasks.project_id", "is", null);
  const excludedProjectIds = excludedProjects.filter(
    (value) => value !== "none",
  );
  if (excludedProjectIds.length)
    query = query.not(
      "tasks.project_id",
      "in",
      `(${excludedProjectIds.join(",")})`,
    );

  const people = values("people", "person").filter((value) => value !== "all");
  const excludedPeople = values("excludePeople");
  const personIds = people.filter((value) => value !== "system");
  if (people.includes("system")) {
    const filter = personIds.length
      ? `actor_id.is.null,actor_id.in.(${personIds.join(",")})`
      : "actor_id.is.null";
    query = query.or(filter);
  } else if (personIds.length) query = query.in("actor_id", personIds);
  if (excludedPeople.includes("system"))
    query = query.not("actor_id", "is", null);
  const excludedPersonIds = excludedPeople.filter(
    (value) => value !== "system",
  );
  if (excludedPersonIds.length)
    query = query.not("actor_id", "in", `(${excludedPersonIds.join(",")})`);

  const eventFilter = (event: string) =>
    event === "created"
      ? "action.eq.created the task"
      : event === "updated"
        ? "action.eq.updated the task"
        : event === "moved"
          ? "action.eq.moved task"
          : event === "checklist"
            ? "action.ilike.%checklist%"
            : event === "attachment"
              ? "action.ilike.%attach%"
              : null;
  const events = values("events", "event").filter((value) => value !== "all");
  const includedEventFilters = events.flatMap((event) => {
    const filter = eventFilter(event);
    return filter ? [filter] : [];
  });
  if (includedEventFilters.length)
    query = query.or(includedEventFilters.join(","));
  for (const event of values("excludeEvents")) {
    if (event === "created")
      query = query.not("action", "eq", "created the task");
    else if (event === "updated")
      query = query.not("action", "eq", "updated the task");
    else if (event === "moved") query = query.not("action", "eq", "moved task");
    else if (event === "checklist")
      query = query.not("action", "ilike", "%checklist%");
    else if (event === "attachment")
      query = query.not("action", "ilike", "%attach%");
  }

  const when = params.get("when");
  const windowMs =
    when === "day"
      ? DAY
      : when === "week"
        ? 7 * DAY
        : when === "month"
          ? 30 * DAY
          : null;
  if (windowMs)
    query = query.gte(
      "created_at",
      new Date(Date.now() - windowMs).toISOString(),
    );
  return query;
}

export async function GET(request: Request) {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;
  const params = new URL(request.url).searchParams;
  const { requestedPage, pageSize } = parsePagination(params);
  const selection = `${WORKSPACE_COLUMNS.activity},tasks!inner(${WORKSPACE_COLUMNS.tasks})`;
  let previewProjectIds: string[] | undefined;
  let previewInaccessibleTaskIds: string[] = [];
  const requestedGroupPreview = params.get(ACCESS_PREVIEW_PARAM) ?? undefined;
  const requestedUserPreview =
    params.get(USER_ACCESS_PREVIEW_PARAM) ?? undefined;
  if (requestedGroupPreview || requestedUserPreview) {
    const { data: isOwner } = await authorization.supabase.rpc("is_app_owner");
    if (isOwner) {
      const { data: projects, error: projectsError } =
        await authorization.supabase.from("projects").select("id");
      if (projectsError)
        return databaseFailure(
          request,
          "activity.preview-projects",
          projectsError,
          {
            error: "Activity could not be loaded. Try again.",
          },
        );
      const resolved = await resolveAccessPreview(authorization.supabase, {
        groupId: requestedGroupPreview,
        userName: requestedUserPreview,
        allProjectIds: (projects ?? []).map((project) => project.id),
      });
      if (resolved) {
        previewProjectIds = resolved.projectIds;
        previewInaccessibleTaskIds =
          resolved.preview.inaccessibleTaskIds ?? [];
      }
    }
  }

  let countQuery = authorization.supabase
    .from("task_activity")
    .select(selection, { count: "exact", head: true });
  countQuery = applyActivityFilters(
    countQuery,
    params,
    previewProjectIds,
    previewInaccessibleTaskIds,
  );
  const countResult = await countQuery;
  if (countResult.error)
    return databaseFailure(request, "activity.count", countResult.error, {
      error: "Activity could not be loaded. Try again.",
    });

  const page = derivePagination(
    requestedPage,
    pageSize,
    countResult.count ?? 0,
  );
  let itemQuery = authorization.supabase
    .from("task_activity")
    .select(selection);
  itemQuery = applyActivityFilters(
    itemQuery,
    params,
    previewProjectIds,
    previewInaccessibleTaskIds,
  );
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
  const tasks = [
    ...new Map(rows.map((row) => [row.tasks.id, row.tasks])).values(),
  ];
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
