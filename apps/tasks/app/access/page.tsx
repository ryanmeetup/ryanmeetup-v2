import { AccessPageClient } from "@/components/access";
import { requireQueryData } from "@/lib/workspace-loader";
import { getAdminClient } from "@/lib/server/admin-client";
import { loadWorkspacePage } from "@/lib/server/workspace-page-loader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Team Access | Ryan Meetup Tasks" },
};

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
    grantsResult,
    tasksResult,
    assigneesResult,
  ] = await Promise.all([
    supabase.from("access_groups").select("*").order("name"),
    supabase.from("access_group_members").select("*"),
    supabase.from("project_group_grants").select("*"),
    supabase.from("tasks").select("id, created_by, reported_by, completed_at"),
    supabase.from("task_assignees").select("task_id, profile_id"),
  ]);
  const groups = requireQueryData("access groups", groupsResult);
  const members = requireQueryData("access group members", membersResult);
  const groupGrants = requireQueryData("project group grants", grantsResult);
  const tasks = requireQueryData("task metadata", tasksResult);
  const taskAssignees = requireQueryData("task assignments", assigneesResult);

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
      projects={workspaceData.projects}
      initialGroups={groups}
      initialMembers={members}
      initialGroupGrants={groupGrants}
      userMetadata={userMetadata}
    />
  );
}
