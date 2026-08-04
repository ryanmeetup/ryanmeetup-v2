import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessPreview } from "./types";
import { requireQueryData, requireQueryResult } from "./workspace-loader";

export async function resolveAccessPreview(
  supabase: SupabaseClient,
  options: {
    groupId?: string;
    userId?: string;
    allProjectIds: string[];
  },
): Promise<{ preview: AccessPreview; projectIds: string[] } | null> {
  if (options.groupId) {
    const [groupResult, grantsResult] = await Promise.all([
      supabase
        .from("access_groups")
        .select("id, name")
        .eq("id", options.groupId)
        .maybeSingle(),
      supabase
        .from("project_group_grants")
        .select("project_id")
        .eq("group_id", options.groupId),
    ]);
    const group = requireQueryResult("preview access group", groupResult);
    const grants = requireQueryData("preview project grants", grantsResult);
    if (!group) return null;
    return {
      preview: {
        kind: "group",
        subjectId: group.id,
        subjectName: group.name,
      },
      projectIds: grants.map((grant) => grant.project_id),
    };
  }

  if (!options.userId) return null;
  const profile = requireQueryResult(
    "preview profile",
    await supabase
      .from("profiles")
      .select("id, full_name, app_role")
      .eq("id", options.userId)
      .maybeSingle(),
  );
  if (!profile) return null;
  if (profile.app_role === "owner") {
    return {
      preview: {
        kind: "user",
        subjectId: profile.id,
        subjectName: profile.full_name,
      },
      projectIds: options.allProjectIds,
    };
  }

  const memberships = requireQueryData(
    "preview access memberships",
    await supabase
      .from("access_group_members")
      .select("group_id")
      .eq("profile_id", profile.id),
  );
  const groupIds = memberships.map((membership) => membership.group_id);
  let projectIds: string[] = [];
  if (groupIds.length > 0) {
    const grants = requireQueryData(
      "preview project grants",
      await supabase
        .from("project_group_grants")
        .select("project_id")
        .in("group_id", groupIds),
    );
    projectIds = [...new Set(grants.map((grant) => grant.project_id))];
  }
  return {
    preview: {
      kind: "user",
      subjectId: profile.id,
      subjectName: profile.full_name,
    },
    projectIds,
  };
}
