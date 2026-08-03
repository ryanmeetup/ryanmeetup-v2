import { notFound, redirect } from "next/navigation";
import { AccessPageClient } from "@/components/AccessPageClient";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceData } from "@/lib/types";

export default async function AccessPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: isOwner } = await supabase.rpc("is_app_owner");
  if (!isOwner) notFound();

  const [
    { data: profiles },
    { data: projects },
    { data: groups },
    { data: members },
    { data: groupGrants },
    { data: statuses },
    { data: categories },
  ] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("projects").select("*").order("name"),
    supabase.from("access_groups").select("*").order("name"),
    supabase.from("access_group_members").select("*"),
    supabase.from("project_group_grants").select("*"),
    supabase.from("statuses").select("*").order("sort_order"),
    supabase.from("work_groups").select("*").order("name"),
  ]);

  const currentProfile = profiles?.find(
    (profile) => profile.id === auth.user.id,
  );
  if (!currentProfile) redirect("/login?error=profile");
  const workspaceData: WorkspaceData = {
    currentProfile,
    profiles: profiles ?? [],
    projects: projects ?? [],
    projectOwners: [],
    statuses: statuses ?? [],
    categories: categories ?? [],
    workGroups: [],
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
    <AccessPageClient
      currentUserId={auth.user.id}
      initialData={workspaceData}
      initialProfiles={profiles ?? []}
      projects={projects ?? []}
      initialGroups={groups ?? []}
      initialMembers={members ?? []}
      initialGroupGrants={groupGrants ?? []}
    />
  );
}
