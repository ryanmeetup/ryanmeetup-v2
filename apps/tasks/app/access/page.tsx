import { notFound, redirect } from "next/navigation";
import { AccessPageClient } from "@/components/AccessPageClient";
import { createClient } from "@/lib/supabase/server";
import { loadWorkspace, requireQueryData } from "@/lib/workspace-loader";
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
  const supabase = await createClient();
  const auth = requireQueryData("authenticated user", await supabase.auth.getUser());
  if (!auth.user) redirect("/login");
  const isOwner = requireQueryData("owner access", await supabase.rpc("is_app_owner"));
  if (!isOwner) notFound();

  const [workspaceData, groupsResult, membersResult, grantsResult] = await Promise.all([
    loadWorkspace(supabase, auth.user.id, ["profiles", "projects", "statuses", "categories"]),
    supabase.from("access_groups").select("*").order("name"),
    supabase.from("access_group_members").select("*"),
    supabase.from("project_group_grants").select("*"),
  ]);
  if (!workspaceData) redirect("/login?error=profile");
  const groups = requireQueryData("access groups", groupsResult);
  const members = requireQueryData("access group members", membersResult);
  const groupGrants = requireQueryData("project group grants", grantsResult);

  return (
    <AccessPageClient
      currentUserId={auth.user.id}
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
