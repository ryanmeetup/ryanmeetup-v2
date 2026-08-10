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
    const [groupResult, groupsResult] = await Promise.all([
      supabase
        .from("access_groups")
        .select("id, name, kind, hierarchy_rank, grants_global_content")
        .eq("id", options.groupId)
        .maybeSingle(),
      supabase.from("access_groups").select("id, kind, hierarchy_rank"),
    ]);
    const group = requireQueryResult("preview access group", groupResult);
    const groups = requireQueryData("preview access groups", groupsResult);
    if (!group) return null;
    const inheritedGroupIds =
      group.kind === "tier"
        ? groups
            .filter(
              (candidate) =>
                candidate.kind === "tier" &&
                (candidate.hierarchy_rank ?? 0) <= (group.hierarchy_rank ?? 0),
            )
            .map((candidate) => candidate.id)
        : [group.id];
    const grants = group.grants_global_content
      ? []
      : requireQueryData(
          "preview project grants",
          await supabase
            .from("project_group_grants")
            .select("project_id")
            .in("group_id", inheritedGroupIds),
        );
    return {
      preview: {
        kind: "group",
        subjectId: group.id,
        subjectName: group.name,
      },
      projectIds: group.grants_global_content
        ? options.allProjectIds
        : [...new Set(grants.map((grant) => grant.project_id))],
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

  const [memberships, groups] = await Promise.all([
    supabase
      .from("access_group_members")
      .select("group_id")
      .eq("profile_id", profile.id),
    supabase
      .from("access_groups")
      .select("id, kind, hierarchy_rank, grants_global_content"),
  ]);
  const membershipRows = requireQueryData(
    "preview access memberships",
    memberships,
  );
  const groupRows = requireQueryData("preview access groups", groups);
  const directGroupIds = membershipRows.map(
    (membership) => membership.group_id,
  );
  const memberTier = groupRows.find(
    (group) => group.kind === "tier" && directGroupIds.includes(group.id),
  );
  if (memberTier?.grants_global_content) {
    return {
      preview: {
        kind: "user",
        subjectId: profile.id,
        subjectName: profile.full_name,
      },
      projectIds: options.allProjectIds,
    };
  }
  const groupIds = groupRows
    .filter(
      (group) =>
        directGroupIds.includes(group.id) ||
        (group.kind === "tier" &&
          memberTier?.hierarchy_rank !== null &&
          memberTier?.hierarchy_rank !== undefined &&
          (group.hierarchy_rank ?? 0) <= memberTier.hierarchy_rank),
    )
    .map((group) => group.id);
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
