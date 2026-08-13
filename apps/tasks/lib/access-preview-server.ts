import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessPreview } from "./types";
import { requireQueryData, requireQueryResult } from "./workspace-loader";

async function resolveCategoryAccess(
  supabase: SupabaseClient,
  groupIds: string[],
  hasGlobalAccess: boolean,
) {
  const [categoriesResult, grantsResult, taskCategoriesResult] =
    await Promise.all([
      supabase.from("work_groups").select("id"),
      supabase.from("category_group_grants").select("category_id, group_id"),
      supabase.from("task_categories").select("task_id, category_id"),
    ]);
  const categories = requireQueryData("preview categories", categoriesResult);
  const grants = requireQueryData("preview category grants", grantsResult);
  const taskCategories = requireQueryData(
    "preview task categories",
    taskCategoriesResult,
  );
  const accessibleCategoryIds = hasGlobalAccess
    ? categories.map((category) => category.id)
    : (() => {
        const restrictedCategoryIds = new Set(
          grants.map((grant) => grant.category_id),
        );
        const grantedCategoryIds = new Set(
          grants
            .filter((grant) => groupIds.includes(grant.group_id))
            .map((grant) => grant.category_id),
        );
        return categories
          .filter(
            (category) =>
              !restrictedCategoryIds.has(category.id) ||
              grantedCategoryIds.has(category.id),
          )
          .map((category) => category.id);
      })();
  const accessibleCategoryIdSet = new Set(accessibleCategoryIds);
  return {
    accessibleCategoryIds,
    inaccessibleTaskIds: [
      ...new Set(
        taskCategories
          .filter((item) => !accessibleCategoryIdSet.has(item.category_id))
          .map((item) => item.task_id),
      ),
    ],
  };
}

export async function resolveAccessPreview(
  supabase: SupabaseClient,
  options: {
    groupId?: string;
    userName?: string;
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
    const categoryAccess = await resolveCategoryAccess(
      supabase,
      inheritedGroupIds,
      group.grants_global_content,
    );
    return {
      preview: {
        kind: "group",
        subjectId: group.id,
        subjectName: group.name,
        ...categoryAccess,
      },
      projectIds: group.grants_global_content
        ? options.allProjectIds
        : [...new Set(grants.map((grant) => grant.project_id))],
    };
  }

  if (!options.userName) return null;
  const profiles = requireQueryData(
    "preview profiles",
    await supabase
      .from("profiles")
      .select(
        "id, full_name, avatar_url, onboarding_completed, task_details_open_by_default, app_role, favorite_project_ids",
      )
      .eq("full_name", options.userName)
      .limit(2),
  );
  // Full names are not constrained unique. Never guess if two users share one.
  if (profiles.length !== 1) return null;
  const [profile] = profiles;
  if (profile.app_role === "owner") {
    const categoryAccess = await resolveCategoryAccess(supabase, [], true);
    return {
      preview: {
        kind: "user",
        subjectId: profile.id,
        subjectName: profile.full_name,
        subjectProfile: profile,
        ...categoryAccess,
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
    const categoryAccess = await resolveCategoryAccess(
      supabase,
      directGroupIds,
      true,
    );
    return {
      preview: {
        kind: "user",
        subjectId: profile.id,
        subjectName: profile.full_name,
        subjectProfile: profile,
        ...categoryAccess,
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
  const categoryAccess = await resolveCategoryAccess(
    supabase,
    groupIds,
    false,
  );
  return {
    preview: {
      kind: "user",
      subjectId: profile.id,
      subjectName: profile.full_name,
      subjectProfile: profile,
      ...categoryAccess,
    },
    projectIds,
  };
}
