"use client";

import type { FormEvent } from "react";
import {
  Avatar,
  Button,
  DropdownSelect,
  Input,
  Modal,
  ModalActions,
  Textarea,
} from "@ryanmeetup/ui";
import { FiTrash2 } from "react-icons/fi";
import type { Profile } from "@/lib/workspace/workspace-types";

type EditableGroup = { id: string; name: string };

export function EditAccessGroupModal({
  currentUserId,
  calendarAccess,
  description,
  group,
  members,
  name,
  onAddMember,
  onDelete,
  onRemoveMember,
  onSubmit,
  profiles,
  saving,
  selectedMemberId,
  setDescription,
  setCalendarAccess,
  setGroup,
  setName,
}: {
  currentUserId: string;
  calendarAccess: boolean;
  description: string;
  group: EditableGroup | null;
  members: { profile_id: string }[];
  name: string;
  onAddMember: (profileId: string) => void;
  onDelete: () => void;
  onRemoveMember: (profileId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  profiles: Profile[];
  saving: boolean;
  selectedMemberId: string;
  setDescription: (value: string) => void;
  setCalendarAccess: (value: boolean) => void;
  setGroup: (group: null) => void;
  setName: (value: string) => void;
}) {
  const formId = "edit-access-group-form";

  return (
    <Modal
      open={Boolean(group)}
      setIsOpen={(open) => {
        if (!open && !saving) setGroup(null);
      }}
      title={group ? `Edit ${group.name}` : "Edit access group"}
      size="lg"
      supportingActions={
        group ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            leftIcon={<FiTrash2 />}
            onClick={onDelete}
          >
            Delete group
          </Button>
        ) : undefined
      }
      actions={
        group ? (
          <ModalActions
            confirmForm={formId}
            confirmLabel="Save changes"
            onCancel={() => setGroup(null)}
            pending={saving}
            pendingLabel="Saving..."
          />
        ) : undefined
      }
    >
      {group && (
        <form id={formId} className="space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Group name"
              name="edit-access-group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving}
              required
            />
            <Textarea
              id="edit-access-group-description"
              label="Description"
              name="edit-access-group-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              disabled={saving}
            />
          </div>
          <label className="flex items-start gap-3 border-t border-black/10 pt-5 text-sm dark:border-white/10">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={calendarAccess}
              onChange={(event) => setCalendarAccess(event.target.checked)}
              disabled={saving}
            />
            <span>
              View the workspace Google Calendar
              <span className="mt-1 block text-black/60 dark:text-white/60">
                Members of this group can see events synced from Google.
              </span>
            </span>
          </label>
          <div className="border-t border-black/10 pt-5 dark:border-white/10">
            <div>
              <DropdownSelect
                label="Add member"
                proximityValue={currentUserId}
                variant="field"
                value={selectedMemberId}
                onChange={(profileId) => {
                  if (profileId) onAddMember(profileId);
                }}
                options={[
                  { label: "Select a person…", value: "" },
                  ...profiles
                    .filter(
                      (profile) =>
                        !members.some((item) => item.profile_id === profile.id),
                    )
                    .map((profile) => ({
                      label: profile.full_name,
                      value: profile.id,
                      avatar: {
                        name: profile.full_name,
                        src: profile.avatar_url,
                      },
                    })),
                ]}
              />
              <ul className="mt-3 space-y-2">
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
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => onRemoveMember(member.profile_id)}
                      >
                        Remove
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
