"use client";

import { useState } from "react";
import {
  Avatar,
  Card,
  DropdownSelect,
  IconButton,
  toast,
} from "@ryanmeetup/ui";
import { FiArrowDown, FiTrash2 } from "react-icons/fi";
import { CountBadge } from "@/components/global";
import type { AccessGroup, GroupMember } from "@/lib/access-types";
import type { Profile } from "@/lib/workspace-types";

export function AccessGroupMembersPanel({
  currentProfileId,
  group,
  members,
  profiles,
  onAdd,
  onRemove,
}: {
  currentProfileId: string;
  group: AccessGroup;
  members: GroupMember[];
  profiles: Profile[];
  onAdd: (profileId: string) => Promise<unknown>;
  onRemove: (profileId: string) => Promise<unknown>;
}) {
  const [memberId, setMemberId] = useState("");
  const availableMembers = profiles.filter(
    (profile) => !members.some((member) => member.profile_id === profile.id),
  );

  async function addMember(profileId: string) {
    if (!profileId) return;
    setMemberId("");
    await onAdd(profileId);
    const profileName =
      profiles.find((profile) => profile.id === profileId)?.full_name ??
      "Member";
    toast.success(`${profileName} added to ${group.name}.`);
  }

  async function removeMember(profileId: string) {
    await onRemove(profileId);
    const profileName =
      profiles.find((profile) => profile.id === profileId)?.full_name ??
      "Member";
    toast.success(`${profileName} removed from ${group.name}.`);
  }

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden p-5 xl:h-[32rem] xl:max-h-[32rem] xl:min-h-[28rem]">
      <h2 className="flex items-center gap-2 font-semibold">
        Members <CountBadge>{members.length}</CountBadge>
      </h2>
      <div className="mt-4">
        {availableMembers.length > 0 ? (
          <DropdownSelect
            label="Add member"
            proximityValue={currentProfileId}
            variant="field"
            value={memberId}
            onChange={(value) => void addMember(value)}
            options={[
              { label: "Select a person…", value: "" },
              ...availableMembers.map((profile) => ({
                label: profile.full_name,
                value: profile.id,
                avatar: { name: profile.full_name, src: profile.avatar_url },
              })),
            ]}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-black/15 px-4 py-3 text-sm text-black/65 dark:border-white/15 dark:text-white/65">
            Everyone is already a member of this group.
          </div>
        )}
      </div>
      {members.length > 5 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-black/60 dark:text-white/60">
          <FiArrowDown aria-hidden /> Scroll to see all {members.length} members
        </p>
      )}
      <ul className="-mb-5 mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-5">
        {members.map((member) => {
          const profile = profiles.find(
            (item) => item.id === member.profile_id,
          );
          return (
            <li
              key={member.profile_id}
              className="flex items-center justify-between gap-3 rounded-xl bg-black/5 px-3 py-2 text-sm dark:bg-white/5"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Avatar
                  name={profile?.full_name ?? "Unknown user"}
                  src={profile?.avatar_url}
                  size="sm"
                />
                <span className="truncate">
                  {profile?.full_name ?? "Unknown user"}
                </span>
              </span>
              {group.kind === "team" && (
                <IconButton
                  label={`Remove “${profile?.full_name ?? "member"}” from “${group.name}”`}
                  variant="danger"
                  onClick={() => void removeMember(member.profile_id)}
                >
                  <FiTrash2 />
                </IconButton>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
