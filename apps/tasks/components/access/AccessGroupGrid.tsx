import { Avatar, Button, Card, IconButton } from "@ryanmeetup/ui";
import { FiCalendar, FiEdit2, FiEye, FiUsers } from "react-icons/fi";
import { accessGroupSlug } from "@/lib/access/access-groups";
import { accessPreviewHref } from "@/lib/access/access-preview";
import type { AccessGroup, GroupMember } from "@/lib/access/access-types";
import type { Profile } from "@/lib/workspace/workspace-types";
import { AccessGroupKindBadge } from "./AccessGroupKindBadge";
import { adminAccessGroupPath } from "@/lib/admin/admin-routes";

export function AccessGroupGrid({
  groups,
  members,
  profiles,
}: {
  groups: AccessGroup[];
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
                <IconButton.Link
                  href={adminAccessGroupPath(accessGroupSlug(group.name))}
                  label={`Manage ${group.name}`}
                  size="md"
                  variant="edit"
                >
                  <FiEdit2 />
                </IconButton.Link>
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
                    <FiCalendar /> Calendar
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {group.calendar_access ? "Yes" : "No"}
                  </p>
                </div>
              </div>
              <Button.Link
                href={accessPreviewHref(group.name)}
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
