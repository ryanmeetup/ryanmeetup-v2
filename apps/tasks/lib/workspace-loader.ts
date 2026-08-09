import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceData } from "./types";

type QueryFailure = {
  code?: string;
  message?: string;
};

type QueryResult<T> = {
  data: T;
  error: QueryFailure | null;
};

export class WorkspaceLoadError extends Error {
  readonly correlationId: string;
  readonly operation: string;

  constructor(operation: string, failure?: QueryFailure | null) {
    const correlationId = crypto.randomUUID();
    super(`Workspace data could not be loaded. Reference: ${correlationId}`);
    this.name = "WorkspaceLoadError";
    this.correlationId = correlationId;
    this.operation = operation;
    // Next.js exposes an error digest to the route error boundary in production.
    this.digest = correlationId;

    console.error("Workspace load failed", {
      correlationId,
      operation,
      code: failure?.code,
      message: failure?.message,
    });
  }

  digest: string;
}

export function requireQueryData<TResult extends QueryResult<unknown>>(
  operation: string,
  result: TResult,
): NonNullable<TResult["data"]> {
  if (result.error || result.data === null) {
    throw new WorkspaceLoadError(operation, result.error);
  }
  return result.data as NonNullable<TResult["data"]>;
}

export function requireQueryResult<TResult extends QueryResult<unknown>>(
  operation: string,
  result: TResult,
): TResult["data"] {
  if (result.error) throw new WorkspaceLoadError(operation, result.error);
  return result.data;
}

export type WorkspaceCollection = Exclude<
  keyof WorkspaceData,
  "currentProfile" | "accessPreview" | "taskPage" | "activityPage"
>;

export const TASK_PAGE_SIZE = 50;

export const WORKSPACE_COLUMNS = {
  profiles:
    "id,full_name,avatar_url,onboarding_completed,task_details_open_by_default,app_role",
  statuses: "id,name,color,sort_order,order_revision,is_default,is_completed",
  categories: "id,name,description,color,created_by",
  projects: "id,name,description,links,created_by,archived_at,created_at",
  projectOwners: "project_id,profile_id",
  tasks:
    "id,task_number,title,description,status_id,project_id,assignee_id,created_by,reported_by,start_date,due_date,due_time,reminder_at,priority,board_position,completed_at,archived_at,created_at,updated_at",
  subtasks: "id,task_id,title,is_completed,sort_order,created_by,created_at",
  comments: "id,task_id,body,created_by,created_at,edited_at",
  activity: "id,task_id,actor_id,action,details,created_at",
  attachments:
    "id,task_id,name,url,file_path,mime_type,size_bytes,created_by,created_at",
  labels: "id,name,color,created_by",
  taskAssignees: "task_id,profile_id",
  taskLabels: "task_id,label_id",
  taskCategories: "task_id,category_id",
} as const;
const columns = WORKSPACE_COLUMNS;

const emptyWorkspace = (): Omit<WorkspaceData, "currentProfile"> => ({
  profiles: [],
  statuses: [],
  categories: [],
  projects: [],
  projectOwners: [],
  tasks: [],
  subtasks: [],
  comments: [],
  activity: [],
  attachments: [],
  labels: [],
  taskAssignees: [],
  taskLabels: [],
  taskCategories: [],
});

export async function loadWorkspace(
  supabase: SupabaseClient,
  userId: string,
  collections: readonly WorkspaceCollection[],
): Promise<WorkspaceData | null> {
  const queries: Record<
    WorkspaceCollection,
    () => PromiseLike<QueryResult<unknown[] | null>>
  > = {
    profiles: () =>
      supabase.from("profiles").select(columns.profiles).order("full_name"),
    statuses: () =>
      supabase.from("statuses").select(columns.statuses).order("sort_order"),
    categories: () =>
      supabase.from("work_groups").select(columns.categories).order("name"),
    projects: () =>
      supabase.from("projects").select(columns.projects).order("name"),
    projectOwners: () =>
      supabase.from("project_owners").select(columns.projectOwners),
    tasks: () =>
      supabase
        .from("tasks")
        .select(columns.tasks)
        .order("updated_at", { ascending: false }),
    subtasks: () =>
      supabase.from("subtasks").select(columns.subtasks).order("sort_order"),
    comments: () =>
      supabase
        .from("task_comments")
        .select(columns.comments)
        .order("created_at"),
    activity: () =>
      supabase
        .from("task_activity")
        .select(columns.activity)
        .order("created_at", { ascending: false }),
    attachments: () =>
      supabase
        .from("task_attachments")
        .select(columns.attachments)
        .order("created_at"),
    labels: () => supabase.from("labels").select(columns.labels).order("name"),
    taskAssignees: () =>
      supabase.from("task_assignees").select(columns.taskAssignees),
    taskLabels: () => supabase.from("task_labels").select(columns.taskLabels),
    taskCategories: () =>
      supabase.from("task_categories").select(columns.taskCategories),
  };

  const [profileResult, ...results] = await Promise.all([
    supabase
      .from("profiles")
      .select(columns.profiles)
      .eq("id", userId)
      .maybeSingle(),
    ...collections.map((collection) => queries[collection]()),
  ]);
  if (profileResult.error) {
    throw new WorkspaceLoadError("current profile", profileResult.error);
  }
  if (!profileResult.data) return null;

  const workspace = emptyWorkspace();
  collections.forEach((collection, index) => {
    const data = requireQueryData(collection, results[index]);
    Object.assign(workspace, { [collection]: data });
  });

  return { ...workspace, currentProfile: profileResult.data } as WorkspaceData;
}
