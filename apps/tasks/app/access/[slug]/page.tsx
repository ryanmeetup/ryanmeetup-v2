import { notFound, redirect } from "next/navigation";
import { AccessGroupPageClient } from "@/components/AccessGroupPageClient";
import { accessGroupSlug } from "@/lib/access-groups";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceData } from "@/lib/types";

export default async function AccessGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: isOwner } = await supabase.rpc("is_app_owner");
  if (!isOwner) notFound();

  const [
    { data: profiles },
    { data: projects },
    { data: groups },
    { data: statuses },
    { data: categories },
  ] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("projects").select("*").order("name"),
    supabase.from("access_groups").select("*").order("name"),
    supabase.from("statuses").select("*").order("sort_order"),
    supabase.from("work_groups").select("*").order("name"),
  ]);
  const group = groups?.find((item) => accessGroupSlug(item.name) === slug);
  if (!group) notFound();
  const [{ data: members }, { data: grants }] = await Promise.all([
    supabase.from("access_group_members").select("*").eq("group_id", group.id),
    supabase.from("project_group_grants").select("*").eq("group_id", group.id),
  ]);
  const currentProfile = profiles?.find(
    (profile) => profile.id === auth.user.id,
  );
  if (!currentProfile) redirect("/login?error=profile");
  const initialData: WorkspaceData = {
    currentProfile,
    profiles: profiles ?? [],
    projects: projects ?? [],
    statuses: statuses ?? [],
    categories: categories ?? [],
    workGroups: [],
    projectOwners: [],
    tasks: [],
    subtasks: [],
    comments: [],
    activity: [],
    attachments: [],
    labels: [],
    taskAssignees: [],
    taskLabels: [],
    taskCategories: [],
  };
  return (
    <AccessGroupPageClient
      currentUserId={auth.user.id}
      initialData={initialData}
      group={group}
      initialMembers={members ?? []}
      initialGrants={grants ?? []}
    />
  );
}
