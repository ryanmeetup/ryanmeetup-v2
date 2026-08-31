"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import {
  Avatar,
  Button,
  Card,
  ConfirmationDialog,
  IconButton,
  Pagination,
  PendingResults,
  SearchInput,
  toast,
  Tooltip,
} from "@ryanmeetup/ui";
import {
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiChevronDown,
  FiEye,
  FiPlus,
  FiShield,
  FiTrash2,
} from "react-icons/fi";
import { useSearchFilter } from "@ryanmeetup/hooks";
import { useAccessManagement } from "@/hooks/useAccessManagement";
import {
  indexGroupsByProfile,
  indexMembersByGroup,
} from "@/lib/access/access-selectors";
import { mutate } from "@/lib/mutation-client";
import { errorMessage } from "@/lib/presentation";
import { userAccessPreviewHref } from "@/lib/access/access-preview";
import {
  sortAccessTeam,
  type TeamSortDirection,
  type TeamSortField,
} from "@/lib/access/access-team-sort";
import { usePagination } from "@/hooks/usePagination";
import type { Profile, WorkspaceData } from "@/lib/workspace/workspace-types";
import { CategoriesModal } from "@/components/categories";
import { categoryController } from "@/components/categories/category-workspace";
import { CountBadge, PageHeader } from "@/components/global";
import { AdminPageShell } from "@/components/admin";
import { ProjectsModal } from "@/components/projects";
import { InviteTeammateModal, RemoveTeammateDialog } from "./TeamDialogs";
import { ProfileAccessModal } from "./ProfileAccessModal";
import { CreateAccessGroupModal } from "./CreateAccessGroupModal";
import { EditAccessGroupModal } from "./EditAccessGroupModal";
import { ContentVisibilityPanel } from "./ContentVisibilityPanel";
import {
  TeamAccessGroups,
  TeamAccountStatus,
  TeamTaskStats,
} from "./TeamMemberDetails";
import { AccessGroupGrid } from "./AccessGroupGrid";
import type {
  AccessGroup,
  GroupGrant,
  GroupMember,
  UserAccessMetadata,
} from "@/lib/access/access-types";

const taskSortOptions: {
  label: string;
  value: Exclude<TeamSortField, "name">;
}[] = [
  { label: "Open", value: "assignedOpen" },
  { label: "Done", value: "assignedCompleted" },
  { label: "Reported", value: "reported" },
  { label: "Assigned", value: "assigned" },
  { label: "Created", value: "created" },
];

export function AccessPageClient({
  currentUserId,
  initialData,
  initialProfiles,
  initialGroups,
  initialMembers,
  initialGroupGrants,
  initialCategoryGrants,
  userMetadata,
}: {
  currentUserId: string;
  initialData: WorkspaceData;
  initialProfiles: Profile[];
  initialGroups: AccessGroup[];
  initialMembers: GroupMember[];
  initialGroupGrants: GroupGrant[];
  initialCategoryGrants: { category_id: string; group_id: string }[];
  userMetadata: UserAccessMetadata[];
}) {
  const [data, setData] = useState(initialData);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectCreateOpen, setProjectCreateOpen] = useState(false);
  const [categoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const [groupCreateOpen, setGroupCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AccessGroup | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [memberSelections, setMemberSelections] = useState<
    Record<string, string>
  >({});
  const [profiles, setProfiles] = useState(initialProfiles);
  const access = useAccessManagement({
    initialGroups,
    initialMembers,
    initialGrants: initialGroupGrants,
  });
  const { groups, members, grants: groupGrants, setMembers } = access;
  const [teamMetadata, setTeamMetadata] = useState(userMetadata);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [groupKind, setGroupKind] = useState<"tier" | "team">("team");
  const [hierarchyRank, setHierarchyRank] = useState("0");
  const [grantsGlobalContent, setGrantsGlobalContent] = useState(false);
  const [calendarAccess, setCalendarAccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [teamPending, setTeamPending] = useState(false);
  const [accessProfile, setAccessProfile] = useState<Profile | null>(null);
  const [accessSelections, setAccessSelections] = useState<string[]>([]);
  const [accessPending, setAccessPending] = useState(false);
  const [profileToRemove, setProfileToRemove] = useState<Profile | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<AccessGroup | null>(null);
  const [teamSortField, setTeamSortField] = useState<TeamSortField>("name");
  const [teamSortDirection, setTeamSortDirection] =
    useState<TeamSortDirection>("asc");
  const { page, pageSize, setPage, setPageSize } = usePagination();
  const metadataByProfile = useMemo(
    () =>
      new Map(teamMetadata.map((metadata) => [metadata.profileId, metadata])),
    [teamMetadata],
  );
  const {
    query: teamQuery,
    setQuery: setTeamQuery,
    filtered: searchedProfiles,
    isPending: teamSearchPending,
  } = useSearchFilter({
    data: profiles,
    buildHaystack: (profile) =>
      `${profile.full_name} ${metadataByProfile.get(profile.id)?.email ?? ""}`.toLowerCase(),
    queryParam: "team-search",
  });
  const sortedProfiles = useMemo(
    () =>
      sortAccessTeam(
        searchedProfiles,
        metadataByProfile,
        teamSortField,
        teamSortDirection,
      ),
    [metadataByProfile, searchedProfiles, teamSortDirection, teamSortField],
  );
  const totalTeamPages = Math.max(
    1,
    Math.ceil(sortedProfiles.length / pageSize),
  );
  const teamPage = Math.min(page, totalTeamPages);
  const paginatedProfiles = sortedProfiles.slice(
    (teamPage - 1) * pageSize,
    teamPage * pageSize,
  );
  const groupsByProfile = useMemo(
    () => indexGroupsByProfile(groups, members),
    [groups, members],
  );
  const membersByGroup = useMemo(() => indexMembersByGroup(members), [members]);
  const editingMembers = editingGroup
    ? (membersByGroup.get(editingGroup.id) ?? [])
    : [];

  useEffect(() => {
    if (page > totalTeamPages) setPage(totalTeamPages);
  }, [page, setPage, totalTeamPages]);

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !color) return;
    setSaving(true);
    const data = await access.createGroup({
      name: name.trim(),
      description: description.trim() || null,
      color,
      kind: groupKind,
      hierarchy_rank: groupKind === "tier" ? Number(hierarchyRank) : null,
      grants_global_content: groupKind === "tier" && grantsGlobalContent,
      calendar_access: calendarAccess,
    });
    setSaving(false);
    setName("");
    setDescription("");
    setColor("");
    setGroupKind("team");
    setHierarchyRank("0");
    setGrantsGlobalContent(false);
    setCalendarAccess(false);
    setGroupCreateOpen(false);
    toast.success(`${data.name} created.`);
  }

  async function updateGroup(event: FormEvent) {
    event.preventDefault();
    if (!editingGroup || !editingName.trim()) return;
    setSaving(true);
    await access.updateGroup(editingGroup.id, {
      name: editingName.trim(),
      description: editingDescription.trim() || null,
      color: editingGroup.color,
      kind: editingGroup.kind,
      hierarchy_rank: editingGroup.hierarchy_rank,
      grants_global_content: editingGroup.grants_global_content,
      calendar_access: editingGroup.calendar_access,
    });
    setSaving(false);
    setEditingGroup(null);
  }
  async function addMember(groupId: string, profileId: string) {
    if (!profileId) return;
    await access.setMember(groupId, profileId);
  }
  async function removeMember(groupId: string, profileId: string) {
    await access.removeMember(groupId, profileId);
  }
  async function confirmDeleteGroup() {
    if (!deleteGroup) return;
    await access.deleteGroup(deleteGroup.id);
    setDeleteGroup(null);
    setEditingGroup(null);
  }

  async function inviteTeammate(event: FormEvent) {
    event.preventDefault();
    if (!inviteEmail.trim() || teamPending) return;
    setTeamPending(true);
    try {
      const result = await mutate<{ profile: Profile }>("/api/team", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, fullName: inviteName }),
      });
      setProfiles((current) =>
        [...current, result.profile!].sort((a, b) =>
          a.full_name.localeCompare(b.full_name),
        ),
      );
      setData((current) => ({
        ...current,
        profiles: [...current.profiles, result.profile!],
      }));
      setTeamMetadata((current) => [
        ...current,
        {
          profileId: result.profile!.id,
          email: inviteEmail.trim(),
          invitedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          lastSignInAt: null,
          assigned: 0,
          assignedOpen: 0,
          assignedCompleted: 0,
          created: 0,
          reported: 0,
        },
      ]);
      setInviteName("");
      setInviteEmail("");
      setInviteOpen(false);
      toast.success(`Invitation sent to ${result.profile.full_name}.`);
    } catch (error) {
      toast.error(errorMessage(error, "The invitation could not be sent."));
    } finally {
      setTeamPending(false);
    }
  }

  async function removeTeammate() {
    if (!profileToRemove || teamPending) return;
    setTeamPending(true);
    try {
      await mutate("/api/team", {
        method: "DELETE",
        body: JSON.stringify({ userId: profileToRemove.id }),
      });
      const removedId = profileToRemove.id;
      setProfiles((current) =>
        current.filter((profile) => profile.id !== removedId),
      );
      setData((current) => ({
        ...current,
        profiles: current.profiles.filter(
          (profile) => profile.id !== removedId,
        ),
      }));
      setMembers((current) =>
        current.filter((member) => member.profile_id !== removedId),
      );
      setTeamMetadata((current) =>
        current.filter((metadata) => metadata.profileId !== removedId),
      );
      setProfileToRemove(null);
      toast.success(`${profileToRemove.full_name} removed.`);
    } catch (error) {
      toast.error(errorMessage(error, "The teammate could not be removed."));
    } finally {
      setTeamPending(false);
    }
  }

  function editProfileAccess(profile: Profile) {
    setAccessProfile(profile);
    setAccessSelections(
      members
        .filter((member) => member.profile_id === profile.id)
        .map((member) => member.group_id),
    );
  }

  async function saveProfileAccess(event: FormEvent) {
    event.preventDefault();
    if (!accessProfile || accessPending) return;

    const profileId = accessProfile.id;
    const tierGroups = groups.filter((group) => group.kind === "tier");
    const teamGroups = groups.filter((group) => group.kind === "team");
    const selectedTierId = accessSelections.find((groupId) =>
      tierGroups.some((group) => group.id === groupId),
    );
    if (!selectedTierId) {
      toast.error("Choose one organizational tier.");
      return;
    }
    const currentTierId = members.find(
      (member) =>
        member.profile_id === profileId &&
        tierGroups.some((group) => group.id === member.group_id),
    )?.group_id;
    const currentGroupIds = new Set(
      members
        .filter(
          (member) =>
            member.profile_id === profileId &&
            teamGroups.some((group) => group.id === member.group_id),
        )
        .map((member) => member.group_id),
    );
    const selectedTeamIds = accessSelections.filter((groupId) =>
      teamGroups.some((group) => group.id === groupId),
    );
    const selectedGroupIds = new Set(selectedTeamIds);
    const groupIdsToAdd = selectedTeamIds.filter(
      (groupId) => !currentGroupIds.has(groupId),
    );
    const groupIdsToRemove = [...currentGroupIds].filter(
      (groupId) => !selectedGroupIds.has(groupId),
    );

    setAccessPending(true);
    try {
      if (currentTierId !== selectedTierId) {
        await access.setMember(selectedTierId, profileId, true);
      }
      for (const groupId of groupIdsToAdd) {
        await addMember(groupId, profileId);
      }
      for (const groupId of groupIdsToRemove) {
        await removeMember(groupId, profileId);
      }
      setAccessProfile(null);
      toast.success(`Tier and teams updated for ${accessProfile.full_name}.`);
    } catch (error) {
      toast.error(
        errorMessage(error, "The access groups could not be updated."),
      );
    } finally {
      setAccessPending(false);
    }
  }

  return (
    <>
      <AdminPageShell
        data={data}
        demoMode={false}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onCreateCategory={() => setCategoryCreateOpen(true)}
        onCreateProject={() => setProjectCreateOpen(true)}
        setData={setData}
      >
        <PageHeader
          icon={FiShield}
          title="Access"
          badge={
            <CountBadge size="lg" label="group">
              {groups.length}
            </CountBadge>
          }
          description="Manage workspace membership, access groups, and content visibility."
        />

        <ContentVisibilityPanel
          projects={data.projects}
          categories={data.categories}
          groups={groups}
          projectGrants={groupGrants}
          categoryGrants={initialCategoryGrants}
        />

        <section aria-labelledby="groups-heading" className="space-y-4">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="groups-heading" className="text-xl font-semibold">
              Organizational tiers and teams
            </h2>
            <Button
              size="sm"
              leftIcon={<FiPlus />}
              className="w-full sm:w-auto"
              onClick={() => setGroupCreateOpen(true)}
            >
              New group
            </Button>
          </div>
          <AccessGroupGrid
            groups={groups}
            members={members}
            profiles={profiles}
          />
        </section>

        <section
          aria-labelledby="team-heading"
          className="space-y-4 border-t border-black/10 pt-8 dark:border-white/10"
        >
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="team-heading" className="text-xl font-semibold">
                Team
              </h2>
              <p className="mt-1 text-sm text-black/65 dark:text-white/65">
                Manage the people who can sign in to this workspace.
              </p>
            </div>
            <Button
              size="sm"
              leftIcon={<FiPlus />}
              className="w-full sm:w-auto"
              onClick={() => setInviteOpen(true)}
            >
              Invite Teammate
            </Button>
          </div>
          <SearchInput
            label="Search team"
            name="team-search"
            value={teamQuery}
            onChange={(event) => setTeamQuery(event.target.value)}
            placeholder="Search team..."
            pending={teamSearchPending}
            pendingLabel="Loading team results"
          />
          <Card size="none" className="overflow-hidden">
            <PendingResults pending={teamSearchPending} label="Loading team">
              {searchedProfiles.length === 0 && (
                <p className="p-10 text-center text-sm text-black/55 dark:text-white/55">
                  No people match this search.
                </p>
              )}
              <ul className="grid gap-4 p-4 lg:grid-cols-2 2xl:hidden">
                {paginatedProfiles.map((profile) => {
                  const metadata = metadataByProfile.get(profile.id);
                  const profileGroups = groupsByProfile.get(profile.id) ?? [];

                  return (
                    <li
                      key={profile.id}
                      className="flex min-w-0 flex-col rounded-xl border border-black/10 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.025]"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            name={profile.full_name}
                            src={profile.avatar_url}
                            size="md"
                          />
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold">
                              {profile.full_name}
                            </h3>
                            {metadata?.email && (
                              <p className="truncate text-xs text-black/55 dark:text-white/55">
                                {metadata.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <TeamAccountStatus metadata={metadata} compact />
                      </div>

                      <TeamTaskStats metadata={metadata} compact />
                      <TeamAccessGroups groups={profileGroups} labeled />

                      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-black/10 pt-4 dark:border-white/10 sm:grid-cols-3">
                        <Button
                          size="xs"
                          variant="secondary"
                          leftIcon={<FiShield />}
                          onClick={() => editProfileAccess(profile)}
                        >
                          Manage
                        </Button>
                        <Button.Link
                          href={userAccessPreviewHref(profile.full_name)}
                          size="xs"
                          variant="secondary"
                          leftIcon={<FiEye />}
                        >
                          View as
                        </Button.Link>
                        <Button
                          size="xs"
                          variant="danger"
                          leftIcon={<FiTrash2 />}
                          disabled={profile.id === currentUserId}
                          title={
                            profile.id === currentUserId
                              ? "You cannot remove your own owner account"
                              : undefined
                          }
                          className="col-span-2 sm:col-span-1"
                          onClick={() => setProfileToRemove(profile)}
                        >
                          Remove
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="hidden min-w-0 overflow-x-auto 2xl:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-black/10 bg-black/[0.025] text-[10px] uppercase tracking-[0.16em] text-black/50 dark:border-white/10 dark:bg-white/[0.025] dark:text-white/50">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Person</th>
                      <th className="px-4 py-3 font-semibold">Account</th>
                      <th className="hidden w-px whitespace-nowrap px-4 py-3 font-semibold 2xl:table-cell">
                        <Popover className="relative">
                          <PopoverButton className="inline-flex items-center gap-2 rounded-md py-1 uppercase tracking-[0.16em] transition hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:text-white dark:focus-visible:ring-white/30">
                            Tasks
                            {teamSortField !== "name" && (
                              <span className="border-l border-black/20 pl-2 uppercase tracking-[0.16em] text-black/70 dark:border-white/20 dark:text-white/70">
                                {
                                  taskSortOptions.find(
                                    (option) => option.value === teamSortField,
                                  )?.label
                                }
                              </span>
                            )}
                            <FiChevronDown aria-hidden />
                          </PopoverButton>
                          <PopoverPanel
                            anchor={{ to: "bottom start", padding: 16 }}
                            className="z-50 mt-2 w-64 rounded-xl border border-black/10 bg-white/95 p-2 text-black shadow-xl backdrop-blur focus:outline-none dark:border-white/10 dark:bg-[#181818]/95 dark:text-white"
                          >
                            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45">
                              Sort by task count
                            </p>
                            <div className="space-y-0.5">
                              {taskSortOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    setTeamSortField(option.value);
                                    setPage(1);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:bg-white/10 dark:focus-visible:ring-white/30"
                                >
                                  <span className="flex-1">{option.label}</span>
                                  {teamSortField === option.value && (
                                    <FiCheck aria-hidden />
                                  )}
                                </button>
                              ))}
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-1 border-t border-black/10 pt-2 dark:border-white/10">
                              {(["asc", "desc"] as const).map((direction) => (
                                <button
                                  key={direction}
                                  type="button"
                                  aria-pressed={teamSortDirection === direction}
                                  onClick={() => {
                                    setTeamSortDirection(direction);
                                    setPage(1);
                                  }}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 aria-pressed:bg-black/10 dark:hover:bg-white/10 dark:focus-visible:ring-white/30 dark:aria-pressed:bg-white/10"
                                >
                                  {direction === "asc" ? (
                                    <FiArrowUp aria-hidden />
                                  ) : (
                                    <FiArrowDown aria-hidden />
                                  )}
                                  {direction === "asc"
                                    ? "Ascending"
                                    : "Descending"}
                                </button>
                              ))}
                            </div>
                          </PopoverPanel>
                        </Popover>
                      </th>
                      <th className="hidden px-4 py-3 font-semibold 2xl:table-cell">
                        Access groups
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10 dark:divide-white/10">
                    {paginatedProfiles.map((profile) => {
                      const metadata = metadataByProfile.get(profile.id);
                      const profileGroups =
                        groupsByProfile.get(profile.id) ?? [];
                      return (
                        <tr key={profile.id}>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-3">
                              <Avatar
                                name={profile.full_name}
                                src={profile.avatar_url}
                                size="sm"
                              />
                              <span className="min-w-0">
                                <span className="block font-semibold">
                                  {profile.full_name}
                                </span>
                                {metadata?.email && (
                                  <span className="block truncate text-xs font-normal text-black/55 dark:text-white/55">
                                    {metadata.email}
                                  </span>
                                )}
                              </span>
                            </span>
                          </td>
                          <td className="w-28 whitespace-nowrap px-4 py-3 text-xs text-black/65 dark:text-white/65">
                            <TeamAccountStatus metadata={metadata} />
                          </td>
                          <td className="hidden w-px whitespace-nowrap px-4 py-3 2xl:table-cell">
                            <TeamTaskStats metadata={metadata} />
                          </td>
                          <td className="hidden min-w-48 px-4 py-3 2xl:table-cell">
                            <TeamAccessGroups groups={profileGroups} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <IconButton
                              label={`Manage access groups for “${profile.full_name}”`}
                              onClick={() => editProfileAccess(profile)}
                            >
                              <FiShield />
                            </IconButton>
                            <Tooltip
                              content={`View as ${profile.full_name}`}
                              placement="left"
                            >
                              <Link
                                href={userAccessPreviewHref(profile.full_name)}
                                aria-label={`View as ${profile.full_name}`}
                                className="mx-2 inline-grid h-8 w-8 place-items-center rounded-full border border-black/10 text-black transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/10 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30"
                              >
                                <FiEye />
                              </Link>
                            </Tooltip>
                            {profile.id === currentUserId ? (
                              <Tooltip
                                content="You cannot remove your own owner account because that could lock you out of workspace administration."
                                placement="left"
                              >
                                <IconButton
                                  label="You cannot remove your own owner account"
                                  tooltip={false}
                                  variant="danger"
                                  aria-disabled="true"
                                  className="cursor-not-allowed opacity-40 hover:translate-y-0 hover:border-red-500/20 hover:bg-transparent hover:shadow-none dark:hover:border-red-400/25 dark:hover:bg-transparent"
                                  onClick={(event) => event.preventDefault()}
                                >
                                  <FiTrash2 />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <IconButton
                                label={`Remove “${profile.full_name}”`}
                                variant="danger"
                                onClick={() => setProfileToRemove(profile)}
                              >
                                <FiTrash2 />
                              </IconButton>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </PendingResults>
            <Pagination
              page={teamPage}
              pageSize={pageSize}
              totalCount={searchedProfiles.length}
              itemLabel="people"
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </Card>
        </section>
      </AdminPageShell>

      {projectCreateOpen && (
        <ProjectsModal
          modal={{ open: projectCreateOpen, setOpen: setProjectCreateOpen }}
          workspace={{ data, setData, demoMode: false }}
          options={{ createOnly: true }}
        />
      )}
      {categoryCreateOpen && (
        <CategoriesModal
          modal={{ open: categoryCreateOpen, setOpen: setCategoryCreateOpen }}
          controller={categoryController(data, setData, false)}
          options={{ createOnly: true }}
        />
      )}
      <InviteTeammateModal
        email={inviteEmail}
        name={inviteName}
        onEmailChange={setInviteEmail}
        onNameChange={setInviteName}
        onSubmit={inviteTeammate}
        open={inviteOpen}
        pending={teamPending}
        setOpen={setInviteOpen}
      />
      <ProfileAccessModal
        groups={groups}
        onSubmit={saveProfileAccess}
        pending={accessPending}
        profile={accessProfile}
        selections={accessSelections}
        setProfile={setAccessProfile}
        setSelections={setAccessSelections}
      />
      <CreateAccessGroupModal
        calendarAccess={calendarAccess}
        color={color}
        description={description}
        grantsGlobalContent={grantsGlobalContent}
        hierarchyRank={hierarchyRank}
        kind={groupKind}
        name={name}
        onSubmit={createGroup}
        open={groupCreateOpen}
        saving={saving}
        setColor={setColor}
        setCalendarAccess={setCalendarAccess}
        setDescription={setDescription}
        setGrantsGlobalContent={setGrantsGlobalContent}
        setHierarchyRank={setHierarchyRank}
        setKind={setGroupKind}
        setName={setName}
        setOpen={setGroupCreateOpen}
      />
      <EditAccessGroupModal
        calendarAccess={editingGroup?.calendar_access ?? false}
        currentUserId={currentUserId}
        description={editingDescription}
        group={editingGroup}
        members={editingMembers}
        name={editingName}
        onAddMember={(profileId) => {
          if (!editingGroup) return;
          setMemberSelections((current) => ({
            ...current,
            [editingGroup.id]: "",
          }));
          void addMember(editingGroup.id, profileId);
        }}
        onDelete={() => {
          if (editingGroup) setDeleteGroup(editingGroup);
        }}
        onRemoveMember={(profileId) => {
          if (editingGroup) void removeMember(editingGroup.id, profileId);
        }}
        onSubmit={updateGroup}
        profiles={profiles}
        saving={saving}
        selectedMemberId={
          editingGroup ? (memberSelections[editingGroup.id] ?? "") : ""
        }
        setDescription={setEditingDescription}
        setCalendarAccess={(value) =>
          setEditingGroup((current) =>
            current ? { ...current, calendar_access: value } : current,
          )
        }
        setGroup={setEditingGroup}
        setName={setEditingName}
      />
      <RemoveTeammateDialog
        onConfirm={removeTeammate}
        pending={teamPending}
        profile={profileToRemove}
        setProfile={setProfileToRemove}
      />

      <ConfirmationDialog
        open={Boolean(deleteGroup)}
        setOpen={(open) => !open && setDeleteGroup(null)}
        title="Delete Access Group?"
        description={
          deleteGroup
            ? `This removes ${deleteGroup.name} and every project grant attached to it. Anyone relying on those grants may immediately lose access.`
            : ""
        }
        confirmLabel="Delete group"
        destructive
        onConfirm={confirmDeleteGroup}
      />
    </>
  );
}
