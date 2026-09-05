import type { AccessGroup, GroupMember } from "@/lib/access/access-types";

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
