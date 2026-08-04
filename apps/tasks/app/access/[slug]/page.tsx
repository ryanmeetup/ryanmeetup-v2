import { notFound, redirect } from "next/navigation";
import { AccessGroupPageClient } from "@/components/AccessGroupPageClient";
import { accessGroupSlug } from "@/lib/access-groups";
import { createClient } from "@/lib/supabase/server";
import { loadWorkspace, requireQueryData } from "@/lib/workspace-loader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Access Group",
};

export default async function AccessGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const auth = requireQueryData("authenticated user", await supabase.auth.getUser());
  if (!auth.user) redirect("/login");
  const isOwner = requireQueryData("owner access", await supabase.rpc("is_app_owner"));
  if (!isOwner) notFound();

  const [initialData, groupsResult] = await Promise.all([
    loadWorkspace(supabase, auth.user.id, ["profiles", "projects", "statuses", "categories"]),
    supabase.from("access_groups").select("*").order("name"),
  ]);
  if (!initialData) redirect("/login?error=profile");
  const groups = requireQueryData("access groups", groupsResult);
  const group = groups.find((item) => accessGroupSlug(item.name) === slug);
  if (!group) notFound();
  const [membersResult, grantsResult] = await Promise.all([
    supabase.from("access_group_members").select("*").eq("group_id", group.id),
    supabase.from("project_group_grants").select("*").eq("group_id", group.id),
  ]);
  const members = requireQueryData("access group members", membersResult);
  const grants = requireQueryData("project group grants", grantsResult);
  return (
    <AccessGroupPageClient
      currentUserId={auth.user.id}
      initialData={initialData}
      group={group}
      initialMembers={members}
      initialGrants={grants}
    />
  );
}
