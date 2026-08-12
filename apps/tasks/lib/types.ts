export type Priority = "low" | "medium" | "high" | "urgent";

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  task_details_open_by_default: boolean;
  favorite_project_ids?: string[];
  app_role?: "owner" | "member";
};

export type Status = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  order_revision: number;
  is_default: boolean;
  is_completed: boolean;
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  links: ProjectLink[];
  created_by: string;
  archived_at: string | null;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  links: ProjectLink[];
  created_by: string;
  archived_at: string | null;
  created_at: string;
};

export type ProjectLink = {
  label: string;
  url: string;
};

export type ProjectAttachment = {
  id: string;
  project_id: string;
  kind: "note" | "file";
  name: string;
  body: string | null;
  url: string;
  file_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_by: string;
  created_at: string;
};

export type CategoryAttachment = Omit<ProjectAttachment, "project_id"> & {
  category_id: string;
};

export type Task = {
  id: string;
  task_number: number;
  title: string;
  description: string | null;
  status_id: string;
  project_id: string | null;
  assignee_id: string | null;
  created_by: string;
  reported_by: string;
  start_date: string | null;
  due_date: string | null;
  due_time: string | null;
  reminder_at: string | null;
  priority: Priority;
  board_position: number;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Subtask = {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
};

export type TaskComment = {
  id: string;
  task_id: string;
  body: string;
  created_by: string;
  created_at: string;
  edited_at: string | null;
};

export type TaskActivity = {
  id: string;
  task_id: string;
  actor_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

export type TaskAttachment = {
  id: string;
  task_id: string;
  name: string;
  url: string;
  file_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_by: string;
  created_at: string;
};

export type Label = {
  id: string;
  name: string;
  color: string;
  created_by: string;
};

export type TaskAssignee = { task_id: string; profile_id: string };
export type TaskLabel = { task_id: string; label_id: string };
export type TaskCategory = { task_id: string; category_id: string };
export type ProjectOwner = { project_id: string; profile_id: string };
export type CategoryOwner = { category_id: string; profile_id: string };

export type AccessPreview = {
  kind: "group" | "user";
  subjectId: string;
  subjectName: string;
};

export type WorkspaceData = {
  tasks: Task[];
  statuses: Status[];
  categories: Category[];
  projects: Project[];
  profiles: Profile[];
  currentProfile: Profile;
  subtasks: Subtask[];
  comments: TaskComment[];
  activity: TaskActivity[];
  attachments: TaskAttachment[];
  labels: Label[];
  taskAssignees: TaskAssignee[];
  taskLabels: TaskLabel[];
  taskCategories: TaskCategory[];
  projectOwners: ProjectOwner[];
  categoryOwners: CategoryOwner[];
  taskPage?: import("./pagination").PaginationState;
  activityPage?: import("./pagination").PaginationState;
  accessPreview?: AccessPreview;
};
