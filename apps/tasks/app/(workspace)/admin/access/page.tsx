import { AccessPageClient } from "@/components/access";
import type { WorkspaceAreaAccess } from "@/components/access/WorkspaceAreaAccessPanel";
import {
  isWorkspaceAreaKey,
  type WorkspaceAreaKey,
} from "@/lib/access/workspace-areas";
import { isMissingRelation } from "@/lib/server/supabase-errors";
import { requireQueryData } from "@/lib/server/workspace-loader";
import { getAdminClient } from "@/lib/server/admin-client";
import { loadWorkspacePage } from "@/lib/server/workspace-page-loader";
import type { Metadata } from "next";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Team Access") } };
}

export default async function AccessPage() {
  const {
    supabase,
    user,
    data: workspaceData,
  } = await loadWorkspacePage(
    ["profiles", "projects", "statuses", "categories", "categoryOwners"],
    { owner: true },
  );

  const [
    groupsResult,
    membersResult,
    tasksResult,
    assigneesResult,
    areasResult,
    areaGrantsResult,
    projectGrantsResult,
    categoryGrantsResult,
  ] = await Promise.all([
    supabase.from("access_groups").select("*").order("name"),
    supabase.from("access_group_members").select("*"),
    supabase.from("tasks").select("id, created_by, reported_by, completed_at"),
    supabase.from("task_assignees").select("task_id, profile_id"),
    supabase.from("workspace_area_access").select("area, access_mode"),
    supabase.from("workspace_area_group_grants").select("area, group_id"),
    supabase.from("project_group_grants").select("project_id, group_id"),
    supabase.from("category_group_grants").select("category_id, group_id"),
  ]);
  const groups = requireQueryData("access groups", groupsResult);
  const members = requireQueryData("access group members", membersResult);
  const tasks = requireQueryData("task metadata", tasksResult);
  const taskAssignees = requireQueryData("task assignments", assigneesResult);
  // Each group card summarises what that group reaches, and the grants that
  // decide it live on the resource, not the group. Loading them here keeps the
  // cards a render of data the page already holds rather than a query per card.
  const projectGrants = requireQueryData(
    "project access grants",
    projectGrantsResult,
  ).map((grant) => ({
    resourceId: grant.project_id,
    groupId: grant.group_id,
  }));
  const categoryGrants = requireQueryData(
    "category access grants",
    categoryGrantsResult,
  ).map((grant) => ({
    resourceId: grant.category_id,
    groupId: grant.group_id,
  }));

  // Page access is enforced only once its migration has run. Until then the
  // panel renders read-only rather than offering a control that would fail.
  const areaAccessEnforced =
    !isMissingRelation(areasResult.error?.code) &&
    !isMissingRelation(areaGrantsResult.error?.code);
  let workspaceAreaAccess: WorkspaceAreaAccess[] = [];
  if (areaAccessEnforced) {
    const areaRows = requireQueryData("page access", areasResult);
    const areaGrants = requireQueryData("page access grants", areaGrantsResult);
    const groupIdsByArea = new Map<WorkspaceAreaKey, string[]>();
    for (const grant of areaGrants) {
      if (!isWorkspaceAreaKey(grant.area)) continue;
      groupIdsByArea.set(grant.area, [
        ...(groupIdsByArea.get(grant.area) ?? []),
        grant.group_id,
      ]);
    }
    workspaceAreaAccess = areaRows.flatMap((row) =>
      isWorkspaceAreaKey(row.area)
        ? [
            {
              area: row.area,
              accessMode: row.access_mode,
              groupIds: groupIdsByArea.get(row.area) ?? [],
            },
          ]
        : [],
    );
  }

  const admin = getAdminClient();
  const authUsers = admin
    ? (await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users
    : [];
  const authUsersById = new Map(
    authUsers.map((authUser) => [authUser.id, authUser]),
  );
  const assignmentsByProfile = new Map<string, typeof taskAssignees>();
  for (const assignment of taskAssignees) {
    const current = assignmentsByProfile.get(assignment.profile_id) ?? [];
    current.push(assignment);
    assignmentsByProfile.set(assignment.profile_id, current);
  }
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const userMetadata = workspaceData.profiles.map((profile) => {
    const authUser = authUsersById.get(profile.id);
    const assignedTasks = (assignmentsByProfile.get(profile.id) ?? [])
      .map((assignment) => tasksById.get(assignment.task_id))
      .filter((task) => task !== undefined);
    return {
      profileId: profile.id,
      email: authUser?.email ?? null,
      invitedAt: authUser?.invited_at ?? null,
      createdAt: authUser?.created_at ?? null,
      lastSignInAt: authUser?.last_sign_in_at ?? null,
      assigned: assignedTasks.length,
      assignedOpen: assignedTasks.filter((task) => !task.completed_at).length,
      assignedCompleted: assignedTasks.filter((task) => task.completed_at)
        .length,
      created: tasks.filter((task) => task.created_by === profile.id).length,
      reported: tasks.filter((task) => task.reported_by === profile.id).length,
    };
  });

  return (
    <AccessPageClient
      currentUserId={user.id}
      initialData={workspaceData}
      initialProfiles={workspaceData.profiles}
      initialGroups={groups}
      initialMembers={members}
      initialAreaAccess={workspaceAreaAccess}
      areaAccessEnforced={areaAccessEnforced}
      projectGrants={projectGrants}
      categoryGrants={categoryGrants}
      userMetadata={userMetadata}
    />
  );
}
