"use client";

import { useState } from "react";
import { accessMutation } from "@/lib/access/access-mutations";
import type {
  AccessGroup,
  AccessPermission,
  GroupGrant,
  GroupMember,
} from "@/lib/access/access-types";

export function useAccessManagement({
  initialGroups,
  initialMembers,
  initialGrants,
}: {
  initialGroups: AccessGroup[];
  initialMembers: GroupMember[];
  initialGrants: GroupGrant[];
}) {
  const [groups, setGroups] = useState(initialGroups);
  const [members, setMembers] = useState(initialMembers);
  const [grants, setGrants] = useState(initialGrants);
  const [pendingProjectIds, setPendingProjectIds] = useState<Set<string>>(
    new Set(),
  );

  async function createGroup(
    input: Omit<AccessGroup, "id" | "created_by" | "created_at" | "updated_at">,
  ) {
    const { group } = await accessMutation<{ group: AccessGroup }>({
      action: "group.create",
      name: input.name,
      description: input.description,
      color: input.color,
      kind: input.kind,
      hierarchyRank: input.hierarchy_rank,
      grantsGlobalContent: input.grants_global_content,
    });
    setGroups((current) =>
      [...current.filter((item) => item.id !== group.id), group].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    return group;
  }

  async function updateGroup(
    groupId: string,
    input: Omit<AccessGroup, "id" | "created_by" | "created_at" | "updated_at">,
  ) {
    const { group } = await accessMutation<{ group: AccessGroup }>({
      action: "group.update",
      id: groupId,
      name: input.name,
      description: input.description,
      color: input.color,
      kind: input.kind,
      hierarchyRank: input.hierarchy_rank,
      grantsGlobalContent: input.grants_global_content,
    });
    setGroups((current) =>
      current.map((item) => (item.id === group.id ? group : item)),
    );
    return group;
  }

  async function deleteGroup(groupId: string) {
    await accessMutation({ action: "group.delete", id: groupId });
    setGroups((current) => current.filter((item) => item.id !== groupId));
    setMembers((current) =>
      current.filter((item) => item.group_id !== groupId),
    );
    setGrants((current) => current.filter((item) => item.group_id !== groupId));
  }

  async function setMember(groupId: string, profileId: string, tier = false) {
    const { member } = await accessMutation<{ member: GroupMember }>({
      action: tier ? "tier.set" : "member.set",
      groupId,
      profileId,
    });
    setMembers((current) => [
      ...current.filter((item) =>
        tier
          ? item.profile_id !== profileId ||
            !groups.some(
              (group) => group.kind === "tier" && group.id === item.group_id,
            )
          : item.profile_id !== profileId || item.group_id !== groupId,
      ),
      member,
    ]);
    return member;
  }

  async function removeMember(groupId: string, profileId: string) {
    await accessMutation({ action: "member.delete", groupId, profileId });
    setMembers((current) =>
      current.filter(
        (item) => item.group_id !== groupId || item.profile_id !== profileId,
      ),
    );
  }

  async function setGrant(
    groupId: string,
    projectId: string,
    permission: AccessPermission,
  ) {
    const { grant } = await accessMutation<{ grant: GroupGrant }>({
      action: "grant.set",
      groupId,
      projectId,
      permission,
    });
    setGrants((current) => [
      ...current.filter(
        (item) => item.group_id !== groupId || item.project_id !== projectId,
      ),
      grant,
    ]);
    return grant;
  }

  async function removeGrant(groupId: string, projectId: string) {
    await accessMutation({ action: "grant.delete", groupId, projectId });
    setGrants((current) =>
      current.filter(
        (item) => item.group_id !== groupId || item.project_id !== projectId,
      ),
    );
  }

  async function updateGrant(
    groupId: string,
    projectId: string,
    permission: AccessPermission | "none",
  ) {
    setPendingProjectIds((current) => new Set(current).add(projectId));
    try {
      return permission === "none"
        ? await removeGrant(groupId, projectId)
        : await setGrant(groupId, projectId, permission);
    } finally {
      setPendingProjectIds((current) => {
        const next = new Set(current);
        next.delete(projectId);
        return next;
      });
    }
  }

  return {
    groups,
    members,
    grants,
    pendingProjectIds,
    setGroups,
    setMembers,
    setGrants,
    createGroup,
    updateGroup,
    deleteGroup,
    setMember,
    removeMember,
    setGrant,
    removeGrant,
    updateGrant,
  };
}
