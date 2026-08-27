import { DropdownSelect } from "@ryanmeetup/ui";
import { projectStatusOptions } from "@/lib/resources/project-status";
import type { ProjectStatus } from "@/lib/resources/resource-types";

export function ProjectStatusField({
  value,
  onChange,
  disabled,
}: {
  value: ProjectStatus;
  onChange: (status: ProjectStatus) => void;
  disabled: boolean;
}) {
  return (
    <DropdownSelect
      label="Project status"
      required
      variant="field"
      value={value}
      onChange={(nextValue) => onChange(nextValue as ProjectStatus)}
      options={projectStatusOptions}
      disabled={disabled}
    />
  );
}
