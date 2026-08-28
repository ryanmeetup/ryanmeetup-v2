import { DropdownSelect, MultiSelect } from "@ryanmeetup/ui";
import type { Project } from "@/lib/resources/resource-types";

export type ProjectAccessGroup = {
  id: string;
  name: string;
  kind: "tier" | "team";
  hierarchy_rank: number | null;
};

export function ProjectAccessFields({
  groups,
  accessMode,
  groupIds,
  onAccessModeChange,
  onGroupIdsChange,
  disabled,
  loaded,
  owner,
}: {
  groups: ProjectAccessGroup[];
  accessMode: Project["access_mode"];
  groupIds: string[];
  onAccessModeChange: (mode: Project["access_mode"]) => void;
  onGroupIdsChange: (groupIds: string[]) => void;
  disabled: boolean;
  loaded: boolean;
  owner: boolean;
}) {
  if (!owner) {
    return (
      <p className="text-sm text-black/70 dark:text-white/70">
        App owners manage who can access this project.
      </p>
    );
  }

  if (!loaded) {
    return (
      <p role="status" className="text-sm text-black/70 dark:text-white/70">
        Loading project visibility…
      </p>
    );
  }

  return (
    <>
      <DropdownSelect
        variant="field"
        label="Who can access this project?"
        value={accessMode}
        onChange={(value) =>
          onAccessModeChange(value as Project["access_mode"])
        }
        options={[
          { label: "Project owners only", value: "owners" },
          { label: "Everyone in the workspace", value: "open" },
          { label: "Selected access groups", value: "restricted" },
        ]}
        disabled={disabled}
        required
      />
      {accessMode === "restricted" && (
        <MultiSelect
          label="Access groups"
          options={groups.map((group) => ({
            label: group.name,
            value: group.id,
          }))}
          value={groupIds}
          onChange={onGroupIdsChange}
          placeholder="Choose access groups"
          searchable
          searchPlaceholder="Search access groups"
          disabled={disabled}
        />
      )}
    </>
  );
}
