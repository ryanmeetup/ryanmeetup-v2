import { AccessPageClient } from "@/components/access";
import { requireQueryData } from "@/lib/workspace-loader";
import { loadWorkspacePage } from "@/lib/server/workspace-page-loader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team Access",
};

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const {
    supabase,
    user,
    data: workspaceData,
  } = await loadWorkspacePage(
    ["profiles", "projects", "statuses", "categories"],
    { owner: true },
  );

  const [groupsResult, membersResult, grantsResult] = await Promise.all([
    supabase.from("access_groups").select("*").order("name"),
    supabase.from("access_group_members").select("*"),
    supabase.from("project_group_grants").select("*"),
  ]);
  const groups = requireQueryData("access groups", groupsResult);
  const members = requireQueryData("access group members", membersResult);
  const groupGrants = requireQueryData("project group grants", grantsResult);

  return (
    <AccessPageClient
      currentUserId={user.id}
      initialData={workspaceData}
      initialProfiles={workspaceData.profiles}
      projects={workspaceData.projects}
      initialGroups={groups}
      initialMembers={members}
      initialGroupGrants={groupGrants}
      initialStatusSettingsOpen={query.statuses === "1"}
    />
  );
}
