"use client";

import type { FormEvent } from "react";
import {
  DropdownSelect,
  Modal,
  ModalActions,
  MultiSelect,
} from "@ryanmeetup/ui";
import type { Profile } from "@/lib/workspace/workspace-types";

type AccessGroupOption = {
  id: string;
  name: string;
  color: string;
  kind: "tier" | "team";
  hierarchy_rank?: number | null;
  is_default: boolean;
};

export function ProfileAccessModal({
  appRole,
  groups,
  onSubmit,
  pending,
  profile,
  selections,
  setAppRole,
  setProfile,
  setSelections,
}: {
  appRole: "owner" | "member";
  groups: AccessGroupOption[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  profile: Profile | null;
  selections: string[];
  setAppRole: (role: "owner" | "member") => void;
  setProfile: (profile: Profile | null) => void;
  setSelections: (update: (current: string[]) => string[]) => void;
}) {
  const tierGroups = groups.filter((group) => group.kind === "tier");
  const teamGroups = groups.filter((group) => group.kind === "team");
  return (
    <Modal
      open={Boolean(profile)}
      setIsOpen={(open) => {
        if (!open && !pending) setProfile(null);
      }}
      title={
        profile
          ? `Access groups for ${profile.full_name}`
          : "Manage access groups"
      }
      size="md"
      actions={
        <ModalActions
          confirmForm="edit-profile-access-form"
          confirmLabel="Save access"
          onCancel={() => setProfile(null)}
          pending={pending}
          pendingLabel="Saving..."
        />
      }
    >
      <form
        id="edit-profile-access-form"
        className="space-y-4"
        onSubmit={onSubmit}
      >
        <p className="text-sm text-black/65 dark:text-white/65">
          App role controls workspace administration. Tier and teams control
          content access. These settings save together.
        </p>
        <DropdownSelect
          label="App role"
          variant="field"
          value={appRole}
          onChange={(value) => setAppRole(value as "owner" | "member")}
          options={[
            { label: "Team member", value: "member" },
            { label: "App owner", value: "owner" },
          ]}
          disabled={pending}
          required
        />
        <p className="text-sm text-black/65 dark:text-white/65">
          App owners manage people, groups, settings, and all content. The last
          app owner cannot be demoted or removed.
        </p>
        <DropdownSelect
          label="Organizational tier"
          variant="field"
          value={
            selections.find((groupId) =>
              tierGroups.some((group) => group.id === groupId),
            ) ?? ""
          }
          onChange={(tierId) =>
            setSelections((current) => [
              tierId,
              ...current.filter((groupId) =>
                teamGroups.some((group) => group.id === groupId),
              ),
            ])
          }
          options={[...tierGroups]
            .sort((a, b) => (a.hierarchy_rank ?? 0) - (b.hierarchy_rank ?? 0))
            .map((group) => ({
              label: group.is_default
                ? `${group.name} (default for new members)`
                : group.name,
              value: group.id,
            }))}
          disabled={pending}
          required
        />
        <MultiSelect
          label="Teams"
          options={teamGroups.map((group) => ({
            label: group.name,
            value: group.id,
            color: group.color,
          }))}
          value={selections.filter((groupId) =>
            teamGroups.some((group) => group.id === groupId),
          )}
          onChange={(teamIds) =>
            setSelections((current) => [
              ...current.filter((groupId) =>
                tierGroups.some((group) => group.id === groupId),
              ),
              ...teamIds,
            ])
          }
          placeholder={
            groups.length > 0 ? "Select access groups" : "No groups available"
          }
          disabled={pending || groups.length === 0}
        />
        {groups.length === 0 && (
          <p className="text-sm text-black/55 dark:text-white/55">
            Create an access group before assigning access here.
          </p>
        )}
      </form>
    </Modal>
  );
}
