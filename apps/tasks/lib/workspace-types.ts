import type { TaskActivity } from "./activity-types";
import type { PaginationState } from "./pagination";
import type {
  Category,
  CategoryOwner,
  Project,
  ProjectOwner,
} from "./resource-types";
import type {
  Label,
  Status,
  Subtask,
  Task,
  TaskAssignee,
  TaskAttachment,
  TaskCategory,
  TaskComment,
  TaskLabel,
} from "./task-types";

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  task_details_open_by_default: boolean;
  favorite_project_ids?: string[];
  app_role?: "owner" | "member";
};

export type AccessPreview = {
  kind: "group" | "user";
  subjectId: string;
  subjectName: string;
  subjectProfile?: Profile;
  accessibleCategoryIds?: string[];
  inaccessibleTaskIds?: string[];
};

export type WorkspaceData = {
  tasks: Task[];
  statuses: Status[];
  categories: Category[];
  projects: Project[];
  profiles: Profile[];
  currentProfile: Profile;
  canManageCategories: boolean;
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
  taskPage?: PaginationState;
  activityPage?: PaginationState;
  accessPreview?: AccessPreview;
};
