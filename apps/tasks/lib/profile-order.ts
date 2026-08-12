import type { Profile } from "@/lib/types";

export function prioritizeCurrentProfile(
  profiles: Profile[],
  currentProfileId: string,
) {
  const currentProfile = profiles.find(
    (profile) => profile.id === currentProfileId,
  );

  if (!currentProfile) return profiles;

  return [
    currentProfile,
    ...profiles.filter((profile) => profile.id !== currentProfileId),
  ];
}
