import { DropdownSelect } from "@ryanmeetup/ui";
import type { AccessPermission } from "@/lib/access/access-types";

export type ProjectAccessGroup = {
  id: string;
  name: string;
  kind: "tier" | "team";
  hierarchy_rank: number | null;
};

export type ProjectAccessGrant = {
  groupId: string;
  permission: AccessPermission;
};

export function ProjectAccessFields({
  groups,
  grants,
  onChange,
  disabled,
  loaded,
  owner,
}: {
  groups: ProjectAccessGroup[];
  grants: ProjectAccessGrant[];
  onChange: (grants: ProjectAccessGrant[]) => void;
  disabled: boolean;
  loaded: boolean;
  owner: boolean;
}) {
  if (!owner) {
    return (
      <p className="text-sm text-black/70 dark:text-white/70">
        App owners manage project access groups.
      </p>
    );
  }

  if (!loaded) {
    return (
      <p role="status" className="text-sm text-black/70 dark:text-white/70">
        Loading project access groups…
      </p>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-black/70 dark:text-white/70">
        No additional access groups are available. Owners and groups with
        workspace-wide content access can still open this project.
      </p>
    );
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">Project access</legend>
      <p className="text-sm text-black/70 dark:text-white/70">
        Choose what each group can do from the moment this project is saved.
        Owners and groups with workspace-wide content access always retain
        manager access.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((group) => {
          const grant = grants.find((item) => item.groupId === group.id);
          return (
            <DropdownSelect
              key={group.id}
              variant="field"
              label={group.name}
              value={grant?.permission ?? "none"}
              onChange={(permission) =>
                onChange(
                  permission === "none"
                    ? grants.filter((item) => item.groupId !== group.id)
                    : [
                        ...grants.filter((item) => item.groupId !== group.id),
                        {
                          groupId: group.id,
                          permission: permission as AccessPermission,
                        },
                      ],
                )
              }
              options={[
                { label: "No access", value: "none" },
                { label: "Can view", value: "viewer" },
                { label: "Can edit", value: "editor" },
                { label: "Can manage", value: "manager" },
              ]}
              disabled={disabled}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
