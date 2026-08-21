"use client";

import type { FormEvent } from "react";
import {
  Avatar,
  Button,
  DropdownSelect,
  Input,
  Modal,
  Textarea,
} from "@ryanmeetup/ui";
import { FiTrash2 } from "react-icons/fi";
import type { Profile } from "@/lib/workspace/workspace-types";
import type { Project } from "@/lib/resources/resource-types";
import type { AccessPermission } from "@/lib/access/access-types";
import { GrantEditor } from "./GrantEditor";

type EditableGroup = { id: string; name: string };

export function EditAccessGroupModal({
  currentUserId,
  description,
  grants,
  group,
  members,
  name,
  onAddGrant,
  onAddMember,
  onDelete,
  onRemoveGrant,
  onRemoveMember,
  onSubmit,
  profiles,
  projectNames,
  projects,
  saving,
  selectedMemberId,
  setDescription,
  setGroup,
  setName,
}: {
  currentUserId: string;
  description: string;
  grants: { project_id: string; permission: AccessPermission }[];
  group: EditableGroup | null;
  members: { profile_id: string }[];
  name: string;
  onAddGrant: (projectId: string, permission: AccessPermission) => void;
  onAddMember: (profileId: string) => void;
  onDelete: () => void;
  onRemoveGrant: (projectId: string) => void;
  onRemoveMember: (profileId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  profiles: Profile[];
  projectNames: Map<string, string>;
  projects: Project[];
  saving: boolean;
  selectedMemberId: string;
  setDescription: (value: string) => void;
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
      hideActions
      footer={
        group ? (
          <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
            <Button
              type="button"
              variant="danger"
              leftIcon={<FiTrash2 />}
              onClick={onDelete}
            >
              Delete group
            </Button>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => setGroup(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form={formId}
                loading={saving}
                loadingText="Saving..."
              >
                Save changes
              </Button>
            </div>
          </div>
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
          <div className="grid gap-6 border-t border-black/10 pt-5 dark:border-white/10 lg:grid-cols-2">
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
            <GrantEditor
              label="Project visibility"
              projects={projects}
              grants={grants.map((grant) => ({
                id: grant.project_id,
                permission: grant.permission,
              }))}
              names={projectNames}
              onAdd={onAddGrant}
              onRemove={onRemoveGrant}
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
