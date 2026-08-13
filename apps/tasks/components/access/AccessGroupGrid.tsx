import Link from "next/link";
import { Avatar, Button, Card, Tooltip } from "@ryanmeetup/ui";
import { FiEdit2, FiEye, FiFolder, FiUsers } from "react-icons/fi";
import { accessGroupSlug } from "@/lib/access-groups";
import { accessPreviewHref } from "@/lib/access-preview";
import type { AccessGroup, GroupGrant, GroupMember } from "@/lib/access-types";
import type { Profile } from "@/lib/types";
import { AccessGroupKindBadge } from "./AccessGroupKindBadge";

export function AccessGroupGrid({
  groups,
  grants,
  members,
  profiles,
}: {
  groups: AccessGroup[];
  grants: GroupGrant[];
  members: GroupMember[];
  profiles: Profile[];
}) {
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile]),
  );

  return (
    <>
      {groups.length === 0 && (
        <Card className="p-5 text-sm text-black/65 dark:text-white/65">
          No access groups yet.
        </Card>
      )}
      <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => {
          const groupMembers = members.filter(
            (item) => item.group_id === group.id,
          );
          const groupGrants = grants.filter(
            (item) => item.group_id === group.id,
          );
          return (
            <Card key={group.id} className="flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="flex min-w-0 items-center gap-2 text-lg leading-tight font-semibold">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="truncate">{group.name}</span>
                    <AccessGroupKindBadge kind={group.kind} />
                  </h3>
                  <p className="mt-1 pb-4 text-sm text-black/65 dark:text-white/65">
                    {group.description || "No description yet."}
                  </p>
                </div>
                <Tooltip content={`Manage ${group.name}`}>
                  <Link
                    href={`/access/${accessGroupSlug(group.name)}`}
                    aria-label={`Manage ${group.name}`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/10 text-black transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/10 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30"
                  >
                    <FiEdit2 />
                  </Link>
                </Tooltip>
              </div>
              <div className="mt-auto grid grid-cols-2 gap-3 border-t border-black/10 pt-4 dark:border-white/10">
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-black/45 dark:text-white/45">
                    <FiUsers /> Members
                  </p>
                  <div className="mt-2 flex items-center">
                    <div className="flex -space-x-2">
                      {groupMembers.slice(0, 3).map((member) => {
                        const profile = profilesById.get(member.profile_id);
                        return profile ? (
                          <Avatar
                            key={profile.id}
                            name={profile.full_name}
                            src={profile.avatar_url}
                            size="sm"
                            className="ring-2 ring-white dark:ring-[#181818]"
                          />
                        ) : null;
                      })}
                    </div>
                    <span className="ml-2 text-sm font-semibold">
                      {groupMembers.length}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-black/45 dark:text-white/45">
                    <FiFolder /> Projects
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {groupGrants.length}
                  </p>
                </div>
              </div>
              <Button.Link
                href={accessPreviewHref(group.id)}
                variant="secondary"
                size="sm"
                leftIcon={<FiEye />}
                className="mt-4 w-full"
              >
                View as group
              </Button.Link>
            </Card>
          );
        })}
      </div>
    </>
  );
}
