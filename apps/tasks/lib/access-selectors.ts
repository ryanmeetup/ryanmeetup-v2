import type {
  AccessGroup,
  AccessPermission,
  GroupGrant,
  GroupMember,
} from "@/lib/access-types";

const permissionRank: Record<AccessPermission, number> = {
  viewer: 1,
  editor: 2,
  manager: 3,
};

export function indexMembersByGroup(members: GroupMember[]) {
  const result = new Map<string, GroupMember[]>();
  for (const member of members) {
    const groupMembers = result.get(member.group_id) ?? [];
    groupMembers.push(member);
    result.set(member.group_id, groupMembers);
  }
  return result;
}

export function indexGroupsByProfile(
  groups: AccessGroup[],
  members: GroupMember[],
) {
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const result = new Map<string, AccessGroup[]>();
  for (const member of members) {
    const group = groupsById.get(member.group_id);
    if (!group) continue;
    const profileGroups = result.get(member.profile_id) ?? [];
    profileGroups.push(group);
    result.set(member.profile_id, profileGroups);
  }
  for (const profileGroups of result.values())
    profileGroups.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

export function indexGrantsByGroup(grants: GroupGrant[]) {
  const result = new Map<string, GroupGrant[]>();
  for (const grant of grants) {
    const groupGrants = result.get(grant.group_id) ?? [];
    groupGrants.push(grant);
    result.set(grant.group_id, groupGrants);
  }
  return result;
}

export function indexGrantsByProject(grants: GroupGrant[]) {
  const result = new Map<string, GroupGrant[]>();
  for (const grant of grants) {
    const projectGrants = result.get(grant.project_id) ?? [];
    projectGrants.push(grant);
    result.set(grant.project_id, projectGrants);
  }
  return result;
}

export type EffectiveProjectAccess = {
  permission: AccessPermission;
  sources: string[];
};

export function selectInheritedProjectAccess(
  group: AccessGroup,
  groups: AccessGroup[],
  grants: GroupGrant[],
) {
  const inheritedGroups =
    group.kind === "tier"
      ? groups.filter(
          (candidate) =>
            candidate.kind === "tier" &&
            candidate.id !== group.id &&
            (candidate.hierarchy_rank ?? 0) < (group.hierarchy_rank ?? 0),
        )
      : [];
  const inheritedNames = new Map(
    inheritedGroups.map((candidate) => [candidate.id, candidate.name]),
  );
  const inheritedIds = new Set(inheritedNames.keys());
  const result = new Map<string, EffectiveProjectAccess>();

  for (const grant of grants) {
    if (!inheritedIds.has(grant.group_id)) continue;
    const current = result.get(grant.project_id);
    const source = inheritedNames.get(grant.group_id);
    if (
      !current ||
      permissionRank[grant.permission] > permissionRank[current.permission]
    ) {
      result.set(grant.project_id, {
        permission: grant.permission,
        sources: source ? [source] : [],
      });
    } else if (
      permissionRank[grant.permission] === permissionRank[current.permission] &&
      source &&
      !current.sources.includes(source)
    ) {
      current.sources.push(source);
    }
  }
  return result;
}

export function selectEffectivePermission(
  direct: GroupGrant | undefined,
  inherited: EffectiveProjectAccess | undefined,
) {
  if (!direct) return inherited?.permission;
  if (
    inherited &&
    permissionRank[inherited.permission] > permissionRank[direct.permission]
  )
    return inherited.permission;
  return direct.permission;
}

export function isInheritedPermissionEffective(
  direct: GroupGrant | undefined,
  inherited: EffectiveProjectAccess | undefined,
) {
  return Boolean(
    inherited &&
    (!direct ||
      permissionRank[inherited.permission] > permissionRank[direct.permission]),
  );
}
