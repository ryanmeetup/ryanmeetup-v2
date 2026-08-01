export type Priority = "low" | "medium" | "high" | "urgent";

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: "admin" | "member";
};

export type Status = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  is_default: boolean;
};

export type WorkGroup = {
  id: string;
  name: string;
  color: string;
  created_by: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status_id: string;
  work_group_id: string | null;
  assignee_id: string | null;
  created_by: string;
  start_date: string | null;
  due_date: string | null;
  priority: Priority;
  created_at: string;
  updated_at: string;
};

export type WorkspaceData = {
  tasks: Task[];
  statuses: Status[];
  workGroups: WorkGroup[];
  profiles: Profile[];
  currentProfile: Profile;
};
