import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessPreview } from "./workspace-types";
import { requireQueryData, requireQueryResult } from "./workspace-loader";

type PreviewCategory = {
  id: string;
  access_mode: "open" | "restricted";
};

type PreviewCategoryGrant = { category_id: string; group_id: string };

export function accessibleCategoryIdsForPreview(
  categories: PreviewCategory[],
  grants: PreviewCategoryGrant[],
  groupIds: string[],
  hasGlobalAccess: boolean,
) {
  if (hasGlobalAccess) return categories.map((category) => category.id);
  const grantedCategoryIds = new Set(
    grants
      .filter((grant) => groupIds.includes(grant.group_id))
      .map((grant) => grant.category_id),
  );
  return categories
    .filter(
      (category) =>
        category.access_mode === "open" || grantedCategoryIds.has(category.id),
    )
    .map((category) => category.id);
}

async function resolveCategoryAccess(
  supabase: SupabaseClient,
  groupIds: string[],
  hasGlobalAccess: boolean,
) {
  const [categoriesResult, grantsResult, taskCategoriesResult] =
    await Promise.all([
      supabase.from("work_groups").select("id, access_mode"),
      supabase.from("category_group_grants").select("category_id, group_id"),
      supabase.from("task_categories").select("task_id, category_id"),
    ]);
  const categories = requireQueryData("preview categories", categoriesResult);
  const grants = requireQueryData("preview category grants", grantsResult);
  const taskCategories = requireQueryData(
    "preview task categories",
    taskCategoriesResult,
  );
  const accessibleCategoryIds = accessibleCategoryIdsForPreview(
    categories,
    grants,
    groupIds,
    hasGlobalAccess,
  );
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
    const groupLookup = supabase
      .from("access_groups")
      .select("id, name, kind, hierarchy_rank, grants_global_content");
    const groupRequest =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        options.groupId,
      )
        ? groupLookup.eq("id", options.groupId)
        : groupLookup.eq("name", options.groupId);
    const [groupResult, groupsResult] = await Promise.all([
      groupRequest.maybeSingle(),
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
  const categoryAccess = await resolveCategoryAccess(supabase, groupIds, false);
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
