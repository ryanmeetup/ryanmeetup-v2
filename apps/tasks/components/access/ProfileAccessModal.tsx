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
};

export function ProfileAccessModal({
  groups,
  onSubmit,
  pending,
  profile,
  selections,
  setProfile,
  setSelections,
}: {
  groups: AccessGroupOption[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  profile: Profile | null;
  selections: string[];
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
          Choose exactly one organizational tier. Higher tiers inherit access
          granted to lower tiers. Teams remain optional and additive.
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
            .map((group) => ({ label: group.name, value: group.id }))}
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
