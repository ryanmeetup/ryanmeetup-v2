export type AccessPermission = "viewer" | "editor" | "manager";

export type AccessGroup = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  kind: "tier" | "team";
  hierarchy_rank: number | null;
  grants_global_content: boolean;
  calendar_access: boolean;
};

export type GroupMember = {
  group_id: string;
  profile_id: string;
  added_by: string;
  created_at: string;
};

export type GroupGrant = {
  project_id: string;
  group_id: string;
  permission: AccessPermission;
  granted_by: string;
};

export type UserAccessMetadata = {
  profileId: string;
  email: string | null;
  invitedAt: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  assigned: number;
  assignedOpen: number;
  assignedCompleted: number;
  created: number;
  reported: number;
};
