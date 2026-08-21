import { MultiSelect } from "@ryanmeetup/ui";
import type { Profile } from "@/lib/workspace/workspace-types";
import { profileSelectOptions } from "@/lib/resources/resource-management";

export function ResourceOwnerSelect({
  disabled = false,
  label,
  onChange,
  profiles,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string[]) => void;
  profiles: Profile[];
  value: string[];
}) {
  return (
    <MultiSelect
      label={label}
      options={profileSelectOptions(profiles)}
      value={value}
      onChange={onChange}
      placeholder="Select owners"
      disabled={disabled}
      required
    />
  );
}
