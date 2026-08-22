import { notFound } from "next/navigation";
import { AccessGroupPageClient } from "@/components/access";
import { accessGroupSlug } from "@/lib/access/access-groups";
import { requireQueryData } from "@/lib/server/workspace-loader";
import { loadWorkspacePage } from "@/lib/server/workspace-page-loader";
import type { Metadata } from "next";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Access Group") } };
}

export default async function AccessGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const {
    supabase,
    user,
    data: initialData,
  } = await loadWorkspacePage(
    ["profiles", "projects", "statuses", "categories", "categoryOwners"],
    { owner: true },
  );

  const groupsResult = await supabase
    .from("access_groups")
    .select("*")
    .order("name");
  const groups = requireQueryData("access groups", groupsResult);
  const group = groups.find((item) => accessGroupSlug(item.name) === slug);
  if (!group) notFound();
  const [membersResult, grantsResult] = await Promise.all([
    supabase.from("access_group_members").select("*").eq("group_id", group.id),
    supabase.from("project_group_grants").select("*"),
  ]);
  const members = requireQueryData("access group members", membersResult);
  const projectGrants = requireQueryData("project group grants", grantsResult);
  return (
    <AccessGroupPageClient
      currentUserId={user.id}
      initialData={initialData}
      group={group}
      initialGroups={groups}
      initialMembers={members}
      initialProjectGrants={projectGrants}
    />
  );
}
