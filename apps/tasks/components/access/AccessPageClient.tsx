"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Avatar,
  Button,
  Card,
  ConfirmationDialog,
  DropdownSelect,
  Heading,
  IconButton,
  Input,
  Modal,
  Pagination,
  Pill,
  Textarea,
  Tooltip,
  toast,
} from "@ryanmeetup/ui";
import {
  FiEdit2,
  FiEye,
  FiFolder,
  FiCheckCircle,
  FiClock,
  FiMenu,
  FiPlus,
  FiShield,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import { accessMutation } from "@/lib/access-mutations";
import { accessGroupSlug } from "@/lib/access-groups";
import { accessPreviewHref, userAccessPreviewHref } from "@/lib/access-preview";
import { usePagination } from "@/hooks/usePagination";
import type { Profile, Project, WorkspaceData } from "@/lib/types";
import { CategoriesModal } from "@/components/categories";
import { TaskBanners } from "@/components/global";
import {
  TaskHeaderActions,
  TaskSearch,
  TasksSidebar,
} from "@/components/navigation";
import { ProjectsModal } from "@/components/projects";

type Permission = "viewer" | "editor" | "manager";
type AccessGroup = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type GroupMember = {
  group_id: string;
  profile_id: string;
  added_by: string;
  created_at: string;
};
type GroupGrant = {
  project_id: string;
  group_id: string;
  permission: Permission;
  granted_by: string;
};
type UserMetadata = {
  profileId: string;
  email: string | null;
  invitedAt: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  assigned: number;
  assignedOpen: number;
  assignedCompleted: number;
  created: number;
  reported: number;
};

function formatAccountDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

export function AccessPageClient({
  currentUserId,
  initialData,
  initialProfiles,
  projects,
  initialGroups,
  initialMembers,
  initialGroupGrants,
  userMetadata,
}: {
  currentUserId: string;
  initialData: WorkspaceData;
  initialProfiles: Profile[];
  projects: Project[];
  initialGroups: AccessGroup[];
  initialMembers: GroupMember[];
  initialGroupGrants: GroupGrant[];
  userMetadata: UserMetadata[];
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
  const [groups, setGroups] = useState(initialGroups);
  const [members, setMembers] = useState(initialMembers);
  const [groupGrants, setGroupGrants] = useState(initialGroupGrants);
  const [teamMetadata, setTeamMetadata] = useState(userMetadata);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [teamPending, setTeamPending] = useState(false);
  const [profileToRemove, setProfileToRemove] = useState<Profile | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<AccessGroup | null>(null);
  const { page, pageSize, setPage, setPageSize } = usePagination();
  const totalTeamPages = Math.max(1, Math.ceil(profiles.length / pageSize));
  const teamPage = Math.min(page, totalTeamPages);
  const paginatedProfiles = profiles.slice(
    (teamPage - 1) * pageSize,
    teamPage * pageSize,
  );
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );
  const metadataByProfile = useMemo(
    () =>
      new Map(teamMetadata.map((metadata) => [metadata.profileId, metadata])),
    [teamMetadata],
  );
  const editingMembers = editingGroup
    ? members.filter((item) => item.group_id === editingGroup.id)
    : [];
  const editingGrants = editingGroup
    ? groupGrants.filter((item) => item.group_id === editingGroup.id)
    : [];

  useEffect(() => {
    if (page > totalTeamPages) setPage(totalTeamPages);
  }, [page, setPage, totalTeamPages]);

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { group: data } = await accessMutation<{ group: AccessGroup }>({
      action: "group.create",
      name: name.trim(),
      description: description.trim() || null,
    });
    setSaving(false);
    setGroups((current) =>
      [...current, data].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setName("");
    setDescription("");
    setGroupCreateOpen(false);
    toast.success(`${data.name} created.`);
  }

  async function updateGroup(event: FormEvent) {
    event.preventDefault();
    if (!editingGroup || !editingName.trim()) return;
    setSaving(true);
    const { group: updated } = await accessMutation<{ group: AccessGroup }>({
      action: "group.update",
      id: editingGroup.id,
      name: editingName.trim(),
      description: editingDescription.trim() || null,
    });
    setSaving(false);
    setGroups((current) =>
      current.map((group) => (group.id === updated.id ? updated : group)),
    );
    setEditingGroup(null);
  }
  async function addMember(groupId: string, profileId: string) {
    if (!profileId) return;
    const { member: row } = await accessMutation<{ member: GroupMember }>({
      action: "member.set",
      groupId,
      profileId,
    });
    setMembers((current) => [
      ...current.filter(
        (item) => item.profile_id !== profileId || item.group_id !== groupId,
      ),
      row,
    ]);
  }
  async function removeMember(groupId: string, profileId: string) {
    await accessMutation({ action: "member.delete", groupId, profileId });
    setMembers((current) =>
      current.filter(
        (item) => item.group_id !== groupId || item.profile_id !== profileId,
      ),
    );
  }
  async function setGroupGrant(
    groupId: string,
    projectId: string,
    permission: Permission,
  ) {
    if (!projectId) return;
    const { grant: row } = await accessMutation<{ grant: GroupGrant }>({
      action: "grant.set",
      groupId,
      projectId,
      permission,
    });
    setGroupGrants((current) => [
      ...current.filter(
        (item) => item.group_id !== groupId || item.project_id !== projectId,
      ),
      row,
    ]);
  }
  async function removeGroupGrant(groupId: string, projectId: string) {
    await accessMutation({ action: "grant.delete", groupId, projectId });
    setGroupGrants((current) =>
      current.filter(
        (item) => item.group_id !== groupId || item.project_id !== projectId,
      ),
    );
  }
  async function confirmDeleteGroup() {
    if (!deleteGroup) return;
    await accessMutation({ action: "group.delete", id: deleteGroup.id });
    setGroups((current) =>
      current.filter((item) => item.id !== deleteGroup.id),
    );
    setDeleteGroup(null);
    setEditingGroup(null);
  }

  async function inviteTeammate(event: FormEvent) {
    event.preventDefault();
    if (!inviteEmail.trim() || teamPending) return;
    setTeamPending(true);
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, fullName: inviteName }),
      });
      const result = (await response.json()) as {
        error?: string;
        profile?: Profile;
      };
      if (!response.ok || !result.profile)
        throw new Error(result.error ?? "The invitation could not be sent.");
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
      toast.error(
        error instanceof Error
          ? error.message
          : "The invitation could not be sent.",
      );
    } finally {
      setTeamPending(false);
    }
  }

  async function removeTeammate() {
    if (!profileToRemove || teamPending) return;
    setTeamPending(true);
    try {
      const response = await fetch("/api/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileToRemove.id }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "The teammate could not be removed.");
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
      toast.error(
        error instanceof Error
          ? error.message
          : "The teammate could not be removed.",
      );
    } finally {
      setTeamPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-black dark:bg-[#101010] dark:text-white">
      <TasksSidebar
        data={data}
        demoMode={false}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onCreateCategory={() => setCategoryCreateOpen(true)}
        onCreateProject={() => setProjectCreateOpen(true)}
      />
      <main className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-black/10 bg-[#f7f7f5]/90 px-4 backdrop-blur-xl focus-within:z-[2147483647] dark:border-white/10 dark:bg-[#101010]/90 sm:px-6 lg:px-8">
          <IconButton
            label="Open navigation"
            tooltipTriggerClassName="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu />
          </IconButton>
          <TaskSearch
            tasks={data.tasks}
            projects={data.projects}
            categories={data.categories}
            statuses={data.statuses}
            profiles={data.profiles}
          />
          <TaskHeaderActions data={data} setData={setData} demoMode={false} />
        </header>
        <TaskBanners />
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="space-y-8">
            <div>
              <Heading size="h1" className="flex items-center gap-2 text-4xl">
                <FiShield />
                Access
              </Heading>
              <p className="mt-1 text-sm text-black/65 dark:text-white/65">
                Decide who belongs to each group and which projects that group
                can see.
              </p>
            </div>

            <section aria-labelledby="groups-heading" className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 id="groups-heading" className="text-xl font-semibold">
                  Access groups
                </h2>
                <Button
                  size="sm"
                  leftIcon={<FiPlus />}
                  onClick={() => setGroupCreateOpen(true)}
                >
                  New group
                </Button>
              </div>
              {groups.length === 0 && (
                <Card className="p-5 text-sm text-black/65 dark:text-white/65">
                  No access groups yet.
                </Card>
              )}
              <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-4">
                {groups.map((group) => {
                  const groupMembers = members.filter(
                    (item) => item.group_id === group.id,
                  );
                  const grants = groupGrants.filter(
                    (item) => item.group_id === group.id,
                  );
                  return (
                    <Card key={group.id} className="flex h-full flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold">
                            {group.name}
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
                                const profile = profiles.find(
                                  (item) => item.id === member.profile_id,
                                );
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
                            {grants.length}
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
            </section>

            <section
              aria-labelledby="team-heading"
              className="space-y-4 border-t border-black/10 pt-8 dark:border-white/10"
            >
              <div className="flex items-center justify-between gap-4">
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
                  onClick={() => setInviteOpen(true)}
                >
                  Invite teammate
                </Button>
              </div>
              <Card size="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-black/10 bg-black/[0.025] text-[10px] uppercase tracking-[0.16em] text-black/50 dark:border-white/10 dark:bg-white/[0.025] dark:text-white/50">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Person</th>
                        <th className="px-4 py-3 font-semibold">Account</th>
                        <th className="px-4 py-3 font-semibold">Tasks</th>
                        <th className="px-4 py-3 font-semibold">
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
                        const profileGroups = members
                          .filter((member) => member.profile_id === profile.id)
                          .map((member) =>
                            groups.find(
                              (group) => group.id === member.group_id,
                            ),
                          )
                          .filter((group) => group !== undefined)
                          .sort((a, b) => a.name.localeCompare(b.name));
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
                              <Tooltip
                                placement="right"
                                content={
                                  <dl className="space-y-1">
                                    <div className="flex justify-between gap-4">
                                      <dt className="opacity-65">Last login</dt>
                                      <dd>
                                        {formatAccountDate(
                                          metadata?.lastSignInAt ?? null,
                                        ) ?? "Never"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="opacity-65">
                                        {metadata?.lastSignInAt
                                          ? "Joined"
                                          : "Invite sent"}
                                      </dt>
                                      <dd>
                                        {formatAccountDate(
                                          metadata?.lastSignInAt
                                            ? metadata.createdAt
                                            : (metadata?.invitedAt ??
                                                metadata?.createdAt ??
                                                null),
                                        ) ?? "—"}
                                      </dd>
                                    </div>
                                  </dl>
                                }
                              >
                                <span
                                  tabIndex={0}
                                  className={`inline-flex cursor-help items-center gap-1.5 rounded-full px-2 py-1 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30 ${
                                    metadata?.lastSignInAt
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                      : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                  }`}
                                >
                                  {metadata?.lastSignInAt ? (
                                    <FiCheckCircle aria-hidden="true" />
                                  ) : (
                                    <FiClock aria-hidden="true" />
                                  )}
                                  {metadata?.lastSignInAt
                                    ? "Active"
                                    : "Invited"}
                                </span>
                              </Tooltip>
                            </td>
                            <td className="min-w-[34rem] px-4 py-3">
                              <dl className="grid grid-cols-5 gap-1.5 text-center">
                                <div className="flex flex-col rounded-lg bg-blue-500/[0.08] px-2 py-1.5 text-blue-700 dark:text-blue-300">
                                  <dt className="order-2 text-[9px] font-semibold uppercase tracking-wider opacity-75">
                                    Open
                                  </dt>
                                  <dd className="order-1 font-semibold">
                                    {metadata?.assignedOpen ?? 0}
                                  </dd>
                                </div>
                                <div className="flex flex-col rounded-lg bg-emerald-500/[0.08] px-2 py-1.5 text-emerald-700 dark:text-emerald-300">
                                  <dt className="order-2 text-[9px] font-semibold uppercase tracking-wider opacity-75">
                                    Done
                                  </dt>
                                  <dd className="order-1 font-semibold">
                                    {metadata?.assignedCompleted ?? 0}
                                  </dd>
                                </div>
                                <div className="flex flex-col rounded-lg bg-black/[0.035] px-2 py-1.5 text-black/65 dark:bg-white/[0.06] dark:text-white/65">
                                  <dt className="order-2 text-[9px] font-semibold uppercase tracking-wider opacity-75">
                                    Assigned
                                  </dt>
                                  <dd className="order-1 font-semibold">
                                    {metadata?.assigned ?? 0}
                                  </dd>
                                </div>
                                <div className="flex flex-col rounded-lg bg-violet-500/[0.08] px-2 py-1.5 text-violet-700 dark:text-violet-300">
                                  <dt className="order-2 text-[9px] font-semibold uppercase tracking-wider opacity-75">
                                    Created
                                  </dt>
                                  <dd className="order-1 font-semibold">
                                    {metadata?.created ?? 0}
                                  </dd>
                                </div>
                                <div className="flex flex-col rounded-lg bg-amber-500/[0.08] px-2 py-1.5 text-amber-700 dark:text-amber-300">
                                  <dt className="order-2 text-[9px] font-semibold uppercase tracking-wider opacity-75">
                                    Reported
                                  </dt>
                                  <dd className="order-1 font-semibold">
                                    {metadata?.reported ?? 0}
                                  </dd>
                                </div>
                              </dl>
                            </td>
                            <td className="min-w-48 px-4 py-3">
                              {profileGroups.length > 0 ? (
                                <ul className="flex flex-wrap gap-1.5">
                                  {profileGroups.map((group) => (
                                    <li key={group.id}>
                                      <Link
                                        href={`/access/${accessGroupSlug(group.name)}`}
                                        className="inline-flex rounded-md transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:hover:brightness-125 dark:focus-visible:ring-white/30"
                                      >
                                        <Pill variant="code" size="md">
                                          {group.name}
                                        </Pill>
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-sm text-black/45 dark:text-white/45">
                                  No access assigned
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Tooltip
                                content={`View as ${profile.full_name}`}
                                placement="left"
                              >
                                <Link
                                  href={userAccessPreviewHref(profile.id)}
                                  aria-label={`View as ${profile.full_name}`}
                                  className="mr-2 inline-grid h-8 w-8 place-items-center rounded-full border border-black/10 text-black transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/10 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30"
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
                                  label={`Remove ${profile.full_name}`}
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
                <Pagination
                  page={teamPage}
                  pageSize={pageSize}
                  totalCount={profiles.length}
                  itemLabel="people"
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </Card>
            </section>
          </div>
        </div>
      </main>

      {projectCreateOpen && (
        <ProjectsModal
          open={projectCreateOpen}
          setOpen={setProjectCreateOpen}
          data={data}
          setData={setData}
          demoMode={false}
          createOnly
        />
      )}
      {categoryCreateOpen && (
        <CategoriesModal
          open={categoryCreateOpen}
          setOpen={setCategoryCreateOpen}
          data={data}
          setData={setData}
          demoMode={false}
          createOnly
        />
      )}
      <Modal
        open={inviteOpen}
        setIsOpen={(open) => {
          if (!teamPending) setInviteOpen(open);
        }}
        title="Invite teammate"
        size="md"
        hideActions
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={teamPending}
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="invite-teammate-form"
              size="sm"
              loading={teamPending}
              loadingText="Inviting..."
            >
              Send invitation
            </Button>
          </div>
        }
      >
        <form
          id="invite-teammate-form"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={inviteTeammate}
        >
          <Input
            label="Name"
            name="invite-name"
            value={inviteName}
            onChange={(event) => setInviteName(event.target.value)}
            placeholder="New Ryan"
            disabled={teamPending}
          />
          <Input
            label="Email"
            name="invite-email"
            type="email"
            required
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="ryan@example.com"
            disabled={teamPending}
          />
        </form>
      </Modal>
      <Modal
        open={groupCreateOpen}
        setIsOpen={(open) => {
          if (!saving) setGroupCreateOpen(open);
        }}
        title="New access group"
        size="md"
        hideActions
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => setGroupCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-access-group-form"
              size="sm"
              loading={saving}
              loadingText="Creating..."
            >
              Create group
            </Button>
          </div>
        }
      >
        <form
          id="create-access-group-form"
          className="space-y-4"
          onSubmit={createGroup}
        >
          <Input
            label="Group name"
            name="access-group-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Documentary Team"
            disabled={saving}
            autoFocus
            required
          />
          <Textarea
            id="access-group-description"
            label="Description"
            name="access-group-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Who belongs here and why?"
            disabled={saving}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(editingGroup)}
        setIsOpen={(open) => {
          if (!open && !saving) setEditingGroup(null);
        }}
        title={editingGroup ? `Edit ${editingGroup.name}` : "Edit access group"}
        size="lg"
        hideActions
      >
        {editingGroup && (
          <form className="space-y-6" onSubmit={updateGroup}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Group name"
                name="edit-access-group-name"
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                disabled={saving}
                required
              />
              <Textarea
                id="edit-access-group-description"
                label="Description"
                name="edit-access-group-description"
                value={editingDescription}
                onChange={(event) => setEditingDescription(event.target.value)}
                rows={2}
                disabled={saving}
              />
            </div>
            <div className="grid gap-6 border-t border-black/10 pt-5 dark:border-white/10 lg:grid-cols-2">
              <div>
                <DropdownSelect
                  label="Add member"
                  variant="field"
                  value={memberSelections[editingGroup.id] ?? ""}
                  onChange={(profileId) => {
                    setMemberSelections((current) => ({
                      ...current,
                      [editingGroup.id]: "",
                    }));
                    void addMember(editingGroup.id, profileId);
                  }}
                  options={[
                    { label: "Select a person…", value: "" },
                    ...profiles
                      .filter(
                        (profile) =>
                          !editingMembers.some(
                            (item) => item.profile_id === profile.id,
                          ),
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
                  {editingMembers.map((member) => {
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
                          onClick={() =>
                            removeMember(editingGroup.id, member.profile_id)
                          }
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
                grants={editingGrants.map((grant) => ({
                  id: grant.project_id,
                  permission: grant.permission,
                }))}
                names={projectNames}
                onAdd={(projectId, permission) =>
                  setGroupGrant(editingGroup.id, projectId, permission)
                }
                onRemove={(projectId) =>
                  removeGroupGrant(editingGroup.id, projectId)
                }
              />
            </div>
            <div className="flex flex-col-reverse justify-between gap-3 border-t border-black/10 pt-4 dark:border-white/10 sm:flex-row">
              <Button
                type="button"
                variant="danger"
                leftIcon={<FiTrash2 />}
                onClick={() => setDeleteGroup(editingGroup)}
              >
                Delete group
              </Button>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => setEditingGroup(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={saving} loadingText="Saving...">
                  Save changes
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmationDialog
        open={Boolean(profileToRemove)}
        setOpen={(open) => {
          if (!open && !teamPending) setProfileToRemove(null);
        }}
        title="Remove teammate?"
        description={
          profileToRemove
            ? `Remove ${profileToRemove.full_name} and revoke their workspace access?`
            : ""
        }
        confirmLabel="Remove teammate"
        pendingLabel="Removing..."
        pending={teamPending}
        destructive
        onConfirm={removeTeammate}
      />

      <ConfirmationDialog
        open={Boolean(deleteGroup)}
        setOpen={(open) => !open && setDeleteGroup(null)}
        title="Delete access group?"
        description={
          deleteGroup
            ? `This removes ${deleteGroup.name} and every project grant attached to it. Anyone relying on those grants may immediately lose access.`
            : ""
        }
        confirmLabel="Delete group"
        destructive
        onConfirm={confirmDeleteGroup}
      />
    </div>
  );
}

function GrantEditor({
  label,
  projects,
  grants,
  names,
  onAdd,
  onRemove,
}: {
  label: string;
  projects: Project[];
  grants: { id: string; permission: Permission }[];
  names: Map<string, string>;
  onAdd: (projectId: string, permission: Permission) => void;
  onRemove: (projectId: string) => void;
}) {
  const [permission, setPermission] = useState<Permission>("viewer");
  const [projectId, setProjectId] = useState("");
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <DropdownSelect
          label="Project"
          variant="field"
          value={projectId}
          onChange={(nextProjectId) => {
            setProjectId("");
            if (nextProjectId) onAdd(nextProjectId, permission);
          }}
          options={[
            { label: "Select a project…", value: "" },
            ...projects
              .filter(
                (project) => !grants.some((grant) => grant.id === project.id),
              )
              .map((project) => ({ label: project.name, value: project.id })),
          ]}
        />
        <DropdownSelect
          label="Permission"
          variant="field"
          value={permission}
          onChange={(value) => setPermission(value as Permission)}
          options={[
            { label: "Viewer", value: "viewer" },
            { label: "Editor", value: "editor" },
            { label: "Manager", value: "manager" },
          ]}
        />
      </div>
      <ul className="mt-3 space-y-2">
        {grants.map((grant) => (
          <li
            key={grant.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-black/5 px-3 py-2 text-sm dark:bg-white/5"
          >
            <span>
              {names.get(grant.id) ?? "Unknown project"} ·{" "}
              <span className="capitalize">{grant.permission}</span>
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onRemove(grant.id)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
