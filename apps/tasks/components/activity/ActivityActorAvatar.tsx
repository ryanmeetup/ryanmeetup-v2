import { Avatar, type AvatarProps } from "@ryanmeetup/ui";
import { FiSettings } from "react-icons/fi";
import { profileDisplayName } from "@/lib/presentation";
import type { Profile } from "@/lib/workspace/workspace-types";

const iconSizes: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-2.5 w-2.5",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-7 w-7",
};

/**
 * Activity can be recorded by the workspace itself rather than a teammate.
 * Those entries get a gear instead of initials so an automated change is never
 * mistaken for a person named "System".
 */
export function ActivityActorAvatar({
  profile,
  size = "sm",
}: {
  profile?: Profile;
  size?: AvatarProps["size"];
}) {
  return profile ? (
    <Avatar
      name={profileDisplayName(profile)}
      size={size}
      src={profile.avatar_url}
    />
  ) : (
    <Avatar
      name="System"
      size={size}
      icon={<FiSettings className={iconSizes[size ?? "sm"]} />}
    />
  );
}
