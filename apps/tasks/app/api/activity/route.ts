import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { databaseFailure } from "@/lib/server/api-response";
import { derivePagination, parsePagination } from "@/lib/pagination";
import { WORKSPACE_COLUMNS } from "@/lib/workspace-loader";
import type { Task } from "@/lib/task-types";
import type { TaskActivity } from "@/lib/activity-types";
import {
  ACCESS_PREVIEW_PARAM,
  USER_ACCESS_PREVIEW_PARAM,
} from "@/lib/access-preview";
import { resolveAccessPreview } from "@/lib/access-preview-server";
import { getAdminClient } from "@/lib/server/admin-client";

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

  let itemQuery = authorization.supabase
    .from("task_activity")
    .select(selection);
  itemQuery = applyActivityFilters(
    itemQuery,
    new URLSearchParams(),
    previewProjectIds,
    previewInaccessibleTaskIds,
  );
  const result = await itemQuery
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(5000);
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
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const admin = getAdminClient();
  const auditResult = admin
    ? await admin
        .from("permission_audit_events")
        .select("id,actor_id,action,target_type,target_id,after_state,created_at")
        .contains("after_state", { activity: true })
        .order("created_at", { ascending: false })
        .limit(2000)
    : { data: [], error: null };
  if (auditResult.error)
    return databaseFailure(request, "activity.resources", auditResult.error, {
      error: "Resource activity could not be loaded. Try again.",
    });

  const [visibleProjectsResult, visibleCategoriesResult, visibleNotesResult] =
    await Promise.all([
      authorization.supabase.from("projects").select("id"),
      authorization.supabase.from("work_groups").select("id"),
      authorization.supabase.from("notes").select("id"),
    ]);
  const visibilityError =
    visibleProjectsResult.error ??
    visibleCategoriesResult.error ??
    visibleNotesResult.error;
  if (visibilityError)
    return databaseFailure(request, "activity.visibility", visibilityError, {
      error: "Activity permissions could not be resolved. Try again.",
    });
  const visibleProjectIds = new Set(
    (visibleProjectsResult.data ?? []).map((item) => item.id),
  );
  const visibleCategoryIds = new Set(
    (visibleCategoriesResult.data ?? []).map((item) => item.id),
  );
  const visibleNoteIds = new Set(
    (visibleNotesResult.data ?? []).map((item) => item.id),
  );

  const taskActivity = rows.map(({ tasks: relatedTask, ...item }) => {
    void relatedTask;
    return item;
  });
  const resourceActivity = (auditResult.data ?? []).flatMap((event) => {
    const visible =
      event.target_type === "project"
        ? Boolean(event.target_id && visibleProjectIds.has(event.target_id))
        : event.target_type === "category"
          ? Boolean(event.target_id && visibleCategoryIds.has(event.target_id))
          : event.target_type === "note"
            ? Boolean(
                event.target_id &&
                  (visibleNoteIds.has(event.target_id) ||
                    event.actor_id === authorization.user.id),
              )
            : event.target_type === "organization";
    if (!visible) return [];
    const metadata = (event.after_state ?? {}) as Record<string, unknown>;
    return [{
      id: event.id,
      task_id: null,
      actor_id: event.actor_id,
      action: event.action,
      details: {
        resource_type: event.target_type,
        resource_id: event.target_id ?? undefined,
        resource_name:
          typeof metadata.resource_name === "string"
            ? metadata.resource_name
            : undefined,
        resource_href:
          typeof metadata.resource_href === "string"
            ? metadata.resource_href
            : undefined,
        project_id:
          typeof metadata.project_id === "string"
            ? metadata.project_id
            : undefined,
      },
      created_at: event.created_at,
    } satisfies TaskActivity];
  });
  const values = (name: string) =>
    (params.get(name) ?? "").split(",").filter(Boolean);
  const includedProjects = values("projects");
  const excludedProjects = values("excludeProjects");
  const includedPeople = values("people");
  const excludedPeople = values("excludePeople");
  const includedEvents = values("events");
  const excludedEvents = values("excludeEvents");
  const eventKind = (item: TaskActivity) => {
    if (item.action.startsWith("note.")) return "note";
    if (item.action.startsWith("organization.")) return "organization";
    if (item.action.startsWith("project.")) return "project";
    if (item.action.startsWith("category.")) return "category";
    if (item.action === "created the task") return "created";
    if (item.action === "updated the task") return "updated";
    if (item.action === "moved task") return "moved";
    if (item.action.includes("checklist")) return "checklist";
    if (item.action.includes("attach")) return "attachment";
    return "other";
  };
  const when = params.get("when");
  const cutoff =
    when === "day"
      ? Date.now() - DAY
      : when === "week"
        ? Date.now() - 7 * DAY
        : when === "month"
          ? Date.now() - 30 * DAY
          : null;
  const allActivity = [...taskActivity, ...resourceActivity]
    .filter((item) => {
      const task = item.task_id ? taskById.get(item.task_id) : undefined;
      const projectId = task?.project_id ?? item.details.project_id ?? null;
      const projectValue = projectId ?? "none";
      const actorValue = item.actor_id ?? "system";
      const kind = eventKind(item);
      return (
        (!includedProjects.length || includedProjects.includes(projectValue)) &&
        !excludedProjects.includes(projectValue) &&
        (!includedPeople.length || includedPeople.includes(actorValue)) &&
        !excludedPeople.includes(actorValue) &&
        (!includedEvents.length || includedEvents.includes(kind)) &&
        !excludedEvents.includes(kind) &&
        (!cutoff || new Date(item.created_at).getTime() >= cutoff) &&
        (!previewProjectIds || !projectId || previewProjectIds.includes(projectId))
      );
    })
    .sort(
      (a, b) =>
        b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
    );
  const page = derivePagination(requestedPage, pageSize, allActivity.length);
  const activity = allActivity.slice(page.from, page.to + 1);
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
