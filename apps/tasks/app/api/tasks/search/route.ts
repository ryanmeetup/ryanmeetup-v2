import { NextResponse } from "next/server";
import { authorize } from "@/lib/server/auth";
import { databaseFailure } from "@/lib/server/api-response";
import { WORKSPACE_COLUMNS } from "@/lib/server/workspace-loader";
import { parseTaskKey } from "@/lib/tasks/task-key";
import { TASK_ASSIGNEE_COLUMNS } from "@/lib/workspace/database-shapes";

const SEARCH_LIMIT = 25;
const MIN_QUERY_LENGTH = 3;

export async function GET(request: Request) {
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < MIN_QUERY_LENGTH)
    return NextResponse.json({ tasks: [], totalCount: 0 });

  // PostgREST's `.or()` accepts a filter expression, so strip its structural
  // punctuation while retaining normal words, spaces, and task-key hyphens.
  const safeQuery = query.replace(/[,().%_]/g, " ").trim();
  if (!safeQuery) return NextResponse.json({ tasks: [] });

  const taskNumber = parseTaskKey(safeQuery);
  const projectResult = await authorization.supabase
    .from("projects")
    .select("id")
    .ilike("name", `%${query}%`)
    .limit(SEARCH_LIMIT);
  if (projectResult.error)
    return databaseFailure(
      request,
      "tasks.search-projects",
      projectResult.error,
      {
        error: "Tasks could not be searched. Try again.",
      },
    );
  const projectFilter = (projectResult.data ?? []).length
    ? `,project_id.in.(${projectResult.data!.map((project) => project.id).join(",")})`
    : "";
  let taskQuery = authorization.supabase
    .from("tasks")
    .select(WORKSPACE_COLUMNS.tasks, { count: "exact" })
    .or(`archived_at.is.null,archived_at.gt.${new Date().toISOString()}`);

  taskQuery = taskNumber
    ? taskQuery.or(
        `task_number.eq.${taskNumber},title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%${projectFilter}`,
      )
    : taskQuery.or(
        `title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%${projectFilter}`,
      );

  const result = await taskQuery
    .order("updated_at", { ascending: false })
    .limit(SEARCH_LIMIT);
  if (result.error)
    return databaseFailure(request, "tasks.search", result.error, {
      error: "Tasks could not be searched. Try again.",
    });

  const tasks = result.data ?? [];
  const assignees = tasks.length
    ? await authorization.supabase
        .from("task_assignees")
        .select(TASK_ASSIGNEE_COLUMNS)
        .in(
          "task_id",
          tasks.map((task) => task.id),
        )
    : { data: [], error: null };
  if (assignees.error)
    return databaseFailure(request, "tasks.search-assignees", assignees.error, {
      error: "Task assignees could not be loaded. Try again.",
    });

  return NextResponse.json({
    tasks,
    taskAssignees: assignees.data ?? [],
    totalCount: result.count ?? 0,
  });
}
