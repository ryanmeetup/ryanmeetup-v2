import { notFound } from "next/navigation";
import { AccessGroupPageClient } from "@/components/access";
import { accessGroupSlug } from "@/lib/access-groups";
import { requireQueryData } from "@/lib/workspace-loader";
import { loadWorkspacePage } from "@/lib/server/workspace-page-loader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Access Group | Ryan Meetup Tasks" },
};

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
  const [membersResult, grantsResult, categoryGrantsResult] = await Promise.all(
    [
      supabase
        .from("access_group_members")
        .select("*")
        .eq("group_id", group.id),
      supabase.from("project_group_grants").select("*"),
      supabase
        .from("category_group_grants")
        .select("*")
        .eq("group_id", group.id),
    ],
  );
  const members = requireQueryData("access group members", membersResult);
  const projectGrants = requireQueryData("project group grants", grantsResult);
  const grants = projectGrants.filter((grant) => grant.group_id === group.id);
  const categoryGrants = requireQueryData(
    "category group grants",
    categoryGrantsResult,
  );
  return (
    <AccessGroupPageClient
      currentUserId={user.id}
      initialData={initialData}
      group={group}
      initialGroups={groups}
      initialMembers={members}
      initialGrants={grants}
      initialProjectGrants={projectGrants}
      initialCategoryGrants={categoryGrants}
    />
  );
}
