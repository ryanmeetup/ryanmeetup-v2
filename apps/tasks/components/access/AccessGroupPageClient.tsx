"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSearchFilter } from "@ryanmeetup/hooks";
import {
  Avatar,
  Breadcrumbs,
  Button,
  Card,
  ConfirmationDialog,
  DropdownSelect,
  Heading,
  IconButton,
  Input,
  Textarea,
  toast,
} from "@ryanmeetup/ui";
import {
  FiArrowDown,
  FiCheckCircle,
  FiLoader,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";
import {
  ACCESS_GROUP_COLOR_OPTIONS,
  accessGroupSlug,
} from "@/lib/access-groups";
import { accessMutation } from "@/lib/access-mutations";
import type { WorkspaceData } from "@/lib/types";
import { CategoriesModal } from "@/components/categories";
import { CountBadge, WorkspacePageShell } from "@/components/global";
import { ProjectsModal } from "@/components/projects";
import { AccessGroupKindBadge } from "./AccessGroupKindBadge";
import type {
  AccessGroup,
  AccessPermission,
  CategoryGrant,
  GroupGrant,
  GroupMember,
} from "@/lib/access-types";

const permissionRank: Record<AccessPermission, number> = {
  viewer: 1,
  editor: 2,
  manager: 3,
};

export function AccessGroupPageClient({
  initialData,
  group: initialGroup,
  initialGroups,
  initialMembers,
  initialGrants,
  initialProjectGrants,
  initialCategoryGrants,
}: {
  currentUserId: string;
  initialData: WorkspaceData;
  group: AccessGroup;
  initialGroups: AccessGroup[];
  initialMembers: GroupMember[];
  initialGrants: GroupGrant[];
  initialProjectGrants: GroupGrant[];
  initialCategoryGrants: CategoryGrant[];
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [group, setGroup] = useState(initialGroup);
  const [members, setMembers] = useState(initialMembers);
  const [grants, setGrants] = useState(initialGrants);
  const [projectGrants, setProjectGrants] = useState(initialProjectGrants);
  const [pendingProjectIds, setPendingProjectIds] = useState<Set<string>>(
    new Set(),
  );
  const [categoryGrants, setCategoryGrants] = useState(initialCategoryGrants);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [color, setColor] = useState(group.color);
  const [kind, setKind] = useState<"tier" | "team">(group.kind);
  const [hierarchyRank, setHierarchyRank] = useState(
    String(group.hierarchy_rank ?? 0),
  );
  const [grantsGlobalContent, setGrantsGlobalContent] = useState(
    group.grants_global_content,
  );
  const [memberId, setMemberId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectCreateOpen, setProjectCreateOpen] = useState(false);
  const [categoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const projectNames = useMemo(
    () => new Map(data.projects.map((project) => [project.id, project.name])),
    [data.projects],
  );
  const availableMembers = data.profiles.filter(
    (profile) => !members.some((member) => member.profile_id === profile.id),
  );
  const inheritedGroups = useMemo(
    () =>
      group.kind === "tier"
        ? initialGroups.filter(
            (candidate) =>
              candidate.kind === "tier" &&
              candidate.id !== group.id &&
              (candidate.hierarchy_rank ?? 0) < (group.hierarchy_rank ?? 0),
          )
        : [],
    [group, initialGroups],
  );
  const inheritedGroupNames = useMemo(
    () =>
      new Map(
        inheritedGroups.map((candidate) => [candidate.id, candidate.name]),
      ),
    [inheritedGroups],
  );
  const inheritedAccessByProject = useMemo(() => {
    const inheritedIds = new Set(
      inheritedGroups.map((candidate) => candidate.id),
    );
    const access = new Map<
      string,
      { permission: AccessPermission; sources: string[] }
    >();
    for (const grant of projectGrants) {
      if (!inheritedIds.has(grant.group_id)) continue;
      const current = access.get(grant.project_id);
      const source = inheritedGroupNames.get(grant.group_id);
      if (
        !current ||
        permissionRank[grant.permission] > permissionRank[current.permission]
      ) {
        access.set(grant.project_id, {
          permission: grant.permission,
          sources: source ? [source] : [],
        });
      } else if (
        permissionRank[grant.permission] ===
          permissionRank[current.permission] &&
        source &&
        !current.sources.includes(source)
      ) {
        current.sources.push(source);
      }
    }
    return access;
  }, [inheritedGroupNames, inheritedGroups, projectGrants]);
  const {
    query: projectQuery,
    setQuery: setProjectQuery,
    filtered: filteredProjects,
    isPending: projectSearchPending,
  } = useSearchFilter({
    data: data.projects,
    buildHaystack: (project) =>
      `${project.name} ${project.description ?? ""}`.toLowerCase(),
    queryParam: "project-access-q",
  });
  const categoryNames = useMemo(
    () =>
      new Map(data.categories.map((category) => [category.id, category.name])),
    [data.categories],
  );
  const availableCategories = data.categories.filter(
    (category) =>
      !categoryGrants.some((grant) => grant.category_id === category.id),
  );

  async function saveGroup(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { group: updated } = await accessMutation<{ group: AccessGroup }>({
      action: "group.update",
      id: group.id,
      name: name.trim(),
      description: description.trim() || null,
      color,
      kind,
      hierarchyRank: kind === "tier" ? Number(hierarchyRank) : null,
      grantsGlobalContent: kind === "tier" && grantsGlobalContent,
    });
    setSaving(false);
    setGroup(updated);
    toast.success(`${updated.name} updated.`);
    const nextSlug = accessGroupSlug(updated.name);
    if (nextSlug !== accessGroupSlug(group.name))
      router.replace(`/access/${nextSlug}`);
  }

  async function addMember(profileId: string) {
    if (!profileId) return;
    const profileName =
      data.profiles.find((profile) => profile.id === profileId)?.full_name ??
      "Member";
    setMemberId("");
    const { member: row } = await accessMutation<{ member: GroupMember }>({
      action: group.kind === "tier" ? "tier.set" : "member.set",
      groupId: group.id,
      profileId,
    });
    setMembers((current) => [
      ...current.filter((item) => item.profile_id !== profileId),
      row,
    ]);
    toast.success(`${profileName} added to ${group.name}.`);
  }
  async function removeMember(profileId: string) {
    const profileName =
      data.profiles.find((profile) => profile.id === profileId)?.full_name ??
      "Member";
    await accessMutation({
      action: "member.delete",
      groupId: group.id,
      profileId,
    });
    setMembers((current) =>
      current.filter((item) => item.profile_id !== profileId),
    );
    toast.success(`${profileName} removed from ${group.name}.`);
  }
  async function updateProjectGrant(
    nextProjectId: string,
    nextPermission: AccessPermission | "none",
  ) {
    const projectName = projectNames.get(nextProjectId) ?? "Project";
    setPendingProjectIds((current) => new Set(current).add(nextProjectId));
    try {
      if (nextPermission === "none") {
        await accessMutation({
          action: "grant.delete",
          groupId: group.id,
          projectId: nextProjectId,
        });
        setGrants((current) =>
          current.filter((item) => item.project_id !== nextProjectId),
        );
        setProjectGrants((current) =>
          current.filter(
            (item) =>
              item.project_id !== nextProjectId || item.group_id !== group.id,
          ),
        );
        toast.success(`Direct access to ${projectName} removed.`);
      } else {
        const { grant: row } = await accessMutation<{ grant: GroupGrant }>({
          action: "grant.set",
          groupId: group.id,
          projectId: nextProjectId,
          permission: nextPermission,
        });
        setGrants((current) => [
          ...current.filter((item) => item.project_id !== nextProjectId),
          row,
        ]);
        setProjectGrants((current) => [
          ...current.filter(
            (item) =>
              item.project_id !== nextProjectId || item.group_id !== group.id,
          ),
          row,
        ]);
        toast.success(`${projectName} saved as ${nextPermission}.`);
      }
    } finally {
      setPendingProjectIds((current) => {
        const next = new Set(current);
        next.delete(nextProjectId);
        return next;
      });
    }
  }
  async function addCategoryGrant(nextCategoryId: string) {
    if (!nextCategoryId) return;
    setCategoryId("");
    const { grant } = await accessMutation<{ grant: CategoryGrant }>({
      action: "category-grant.set",
      groupId: group.id,
      categoryId: nextCategoryId,
    });
    setCategoryGrants((current) => [
      ...current.filter((item) => item.category_id !== nextCategoryId),
      grant,
    ]);
    toast.success(
      `${group.name} can now access ${categoryNames.get(nextCategoryId) ?? "that category"} work.`,
    );
  }
  async function removeCategoryGrant(nextCategoryId: string) {
    await accessMutation({
      action: "category-grant.delete",
      groupId: group.id,
      categoryId: nextCategoryId,
    });
    setCategoryGrants((current) =>
      current.filter((item) => item.category_id !== nextCategoryId),
    );
    toast.success(
      `${categoryNames.get(nextCategoryId) ?? "Category"} access removed from ${group.name}.`,
    );
  }
  async function deleteGroup() {
    await accessMutation({ action: "group.delete", id: group.id });
    router.push("/access");
    router.refresh();
  }

  return (
    <>
      <WorkspacePageShell
        data={data}
        demoMode={false}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onCreateCategory={() => setCategoryCreateOpen(true)}
        onCreateProject={() => setProjectCreateOpen(true)}
        setData={setData}
        contentClassName="p-4 sm:p-6 lg:p-8"
      >
        <div className="mx-auto max-w-7xl space-y-6">
          <Breadcrumbs
            variant="compact"
            crumbs={[
              {
                current: false,
                href: "/access",
                icon: <FiUsers aria-hidden className="mr-2 shrink-0" />,
                title: "Access groups",
              },
              {
                current: true,
                href: `/access/${accessGroupSlug(group.name)}`,
                icon: <FiShield aria-hidden className="mr-2 shrink-0" />,
                title: group.name,
              },
            ]}
          />
          <div>
            <Heading
              size="h1"
              className="flex flex-wrap items-center gap-3 text-3xl sm:text-4xl"
            >
              <span
                aria-hidden
                className="h-3.5 w-3.5 shrink-0 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <span>{group.name}</span>
              <AccessGroupKindBadge kind={group.kind} />
            </Heading>
          </div>
          <form onSubmit={saveGroup}>
            <Card className="p-5">
              <div className="space-y-4">
                <Input
                  label="Group name"
                  name="group-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  disabled={saving}
                />
                <Textarea
                  id="group-description"
                  label="Description"
                  name="group-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  disabled={saving}
                />
                <DropdownSelect
                  label="Group type"
                  variant="field"
                  value={kind}
                  onChange={(value) => setKind(value as "tier" | "team")}
                  options={[
                    { label: "Team", value: "team" },
                    { label: "Organizational Tier", value: "tier" },
                  ]}
                  disabled={saving || members.length > 0}
                />
                {kind === "tier" && (
                  <>
                    <Input
                      label="Hierarchy rank"
                      name="group-hierarchy-rank"
                      type="number"
                      min="0"
                      value={hierarchyRank}
                      onChange={(event) => setHierarchyRank(event.target.value)}
                      disabled={saving}
                      required
                    />
                    <p className="text-sm text-black/65 dark:text-white/65">
                      Higher ranks inherit project and category grants from
                      every lower tier.
                    </p>
                    <label className="flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4"
                        checked={grantsGlobalContent}
                        onChange={(event) =>
                          setGrantsGlobalContent(event.target.checked)
                        }
                        disabled={saving}
                      />
                      <span>
                        Grant manager access to all current and future work
                      </span>
                    </label>
                  </>
                )}
                <DropdownSelect
                  label="Color"
                  variant="field"
                  value={color}
                  onChange={setColor}
                  options={ACCESS_GROUP_COLOR_OPTIONS.slice(1)}
                  disabled={saving}
                  required
                />
              </div>
              <div className="mt-5 flex flex-col gap-4 border-t border-black/10 pt-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-black/70 dark:text-white/70">
                  Group details and hierarchy settings save here. Membership and
                  project visibility changes save automatically.
                </p>
                <Button
                  type="submit"
                  className="w-full sm:w-auto sm:shrink-0"
                  loading={saving}
                  loadingText="Saving..."
                >
                  Save details
                </Button>
              </div>
            </Card>
          </form>
          <div className="grid items-stretch gap-6 2xl:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]">
            <Card className="flex min-h-0 flex-col overflow-hidden p-5 2xl:h-[32rem] 2xl:max-h-[32rem] 2xl:min-h-[28rem]">
              <h2 className="flex items-center gap-2 font-semibold">
                Members <CountBadge>{members.length}</CountBadge>
              </h2>
              <div className="mt-4">
                {availableMembers.length > 0 ? (
                  <DropdownSelect
                    label="Add member"
                    proximityValue={data.currentProfile.id}
                    variant="field"
                    value={memberId}
                    onChange={(value) => void addMember(value)}
                    options={[
                      { label: "Select a person…", value: "" },
                      ...availableMembers.map((profile) => ({
                        label: profile.full_name,
                        value: profile.id,
                        avatar: {
                          name: profile.full_name,
                          src: profile.avatar_url,
                        },
                      })),
                    ]}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-black/15 px-4 py-3 text-sm text-black/65 dark:border-white/15 dark:text-white/65">
                    Everyone is already a member of this group.
                  </div>
                )}
              </div>
              {members.length > 5 && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-black/60 dark:text-white/60">
                  <FiArrowDown aria-hidden="true" />
                  Scroll to see all {members.length} members
                </p>
              )}
              <ul className="-mb-5 mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-5">
                {members.map((member) => {
                  const profile = data.profiles.find(
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
                      {group.kind === "team" && (
                        <IconButton
                          label={`Remove “${profile?.full_name ?? "member"}” from “${group.name}”`}
                          variant="danger"
                          onClick={() => removeMember(member.profile_id)}
                        >
                          <FiTrash2 />
                        </IconButton>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card className="flex min-h-0 flex-col overflow-hidden p-5 2xl:h-[32rem] 2xl:max-h-[32rem] 2xl:min-h-[28rem]">
              <h2 className="flex items-center gap-2 font-semibold">
                Project visibility
                <CountBadge>
                  {group.grants_global_content
                    ? `${data.projects.length} global`
                    : `${
                        new Set([
                          ...grants.map((grant) => grant.project_id),
                          ...inheritedAccessByProject.keys(),
                        ]).size
                      } of ${data.projects.length}`}
                </CountBadge>
              </h2>
              {group.grants_global_content && (
                <div className="mt-3 rounded-xl border border-black/10 bg-black/[0.035] px-3 py-2 text-xs text-black/65 dark:border-white/10 dark:bg-white/[0.035] dark:text-white/65">
                  This tier already has manager access to every current and
                  future project. Disable global content access above to use
                  individual project permissions.
                </div>
              )}
              <div className="relative mt-4">
                <Input
                  label="Search projects"
                  name="project-access-search"
                  leadingIcon={<FiSearch aria-hidden />}
                  aria-busy={projectSearchPending}
                  value={projectQuery}
                  onChange={(event) => setProjectQuery(event.target.value)}
                  placeholder="Search projects…"
                  inputClassName="pr-10"
                />
                {projectSearchPending && (
                  <span
                    role="status"
                    aria-label="Filtering project access"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/45 dark:text-white/45"
                  >
                    <FiLoader className="animate-spin motion-reduce:animate-none" />
                  </span>
                )}
              </div>
              <div
                className={`-mb-5 mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-5 pr-1 transition-opacity [scrollbar-gutter:stable] ${projectSearchPending ? "pointer-events-none opacity-55" : ""}`}
                aria-busy={projectSearchPending}
              >
                {filteredProjects.length > 0 ? (
                  <ul className="space-y-2">
                    {filteredProjects.map((project) => {
                      const directGrant = grants.find(
                        (grant) => grant.project_id === project.id,
                      );
                      const inherited = inheritedAccessByProject.get(
                        project.id,
                      );
                      const savingProject = pendingProjectIds.has(project.id);
                      const effectivePermission = directGrant
                        ? inherited &&
                          permissionRank[inherited.permission] >
                            permissionRank[directGrant.permission]
                          ? inherited.permission
                          : directGrant.permission
                        : inherited?.permission;
                      return (
                        <li
                          key={project.id}
                          className="rounded-xl border border-black/5 bg-black/[0.035] p-3 dark:border-white/5 dark:bg-white/[0.035]"
                        >
                          <div className="grid min-w-0 gap-3 min-[400px]:grid-cols-[minmax(0,1fr)_11rem] min-[400px]:items-end">
                            <div className="min-w-0 self-center">
                              <p className="truncate text-sm font-medium">
                                {project.name}
                              </p>
                              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs">
                                {group.grants_global_content ? (
                                  <span className="flex min-w-0 items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                                    <FiCheckCircle
                                      aria-hidden
                                      className="shrink-0"
                                    />
                                    <span>
                                      Manager access across all projects
                                    </span>
                                  </span>
                                ) : effectivePermission ? (
                                  <span className="flex min-w-0 items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                                    <FiCheckCircle
                                      aria-hidden
                                      className="shrink-0"
                                    />
                                    <span className="truncate">
                                      {effectivePermission[0].toUpperCase() +
                                        effectivePermission.slice(1)}{" "}
                                      access
                                      {inherited &&
                                      (!directGrant ||
                                        permissionRank[inherited.permission] >
                                          permissionRank[
                                            directGrant.permission
                                          ])
                                        ? ` via ${inherited.sources.join(", ")}`
                                        : directGrant
                                          ? " · Direct"
                                          : ""}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
                                    <FiXCircle
                                      aria-hidden
                                      className="shrink-0"
                                    />
                                    <span>No access</span>
                                  </span>
                                )}
                                {savingProject && (
                                  <FiLoader
                                    aria-label={`Saving ${project.name} access`}
                                    className="animate-spin motion-reduce:animate-none"
                                  />
                                )}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <DropdownSelect
                                label="Direct permission"
                                variant="field"
                                value={directGrant?.permission ?? "none"}
                                onChange={(value) =>
                                  void updateProjectGrant(
                                    project.id,
                                    value as AccessPermission | "none",
                                  )
                                }
                                options={[
                                  {
                                    label: "No direct access",
                                    value: "none",
                                  },
                                  { label: "Viewer", value: "viewer" },
                                  { label: "Editor", value: "editor" },
                                  { label: "Manager", value: "manager" },
                                ]}
                                disabled={
                                  group.grants_global_content || savingProject
                                }
                              />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="rounded-xl border border-dashed border-black/15 px-4 py-8 text-center text-sm text-black/60 dark:border-white/15 dark:text-white/60">
                    No projects match “{projectQuery}”.
                  </div>
                )}
              </div>
            </Card>
          </div>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              Restricted category access
              <CountBadge>{categoryGrants.length}</CountBadge>
            </h2>
            <p className="mt-1 text-sm text-black/65 dark:text-white/65">
              When a category is restricted, only groups listed here for that
              category can access its tasks. Project permissions still apply.
            </p>
            {availableCategories.length > 0 && (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <DropdownSelect
                  className="min-w-0 flex-1"
                  label="Category"
                  variant="field"
                  value={categoryId}
                  onChange={setCategoryId}
                  options={[
                    { label: "Select a category…", value: "" },
                    ...availableCategories.map((category) => ({
                      label: category.name,
                      value: category.id,
                    })),
                  ]}
                />
                <Button
                  type="button"
                  className="w-full whitespace-nowrap sm:w-auto"
                  disabled={!categoryId}
                  onClick={() => void addCategoryGrant(categoryId)}
                >
                  Allow category
                </Button>
              </div>
            )}
            {categoryGrants.length > 0 ? (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {categoryGrants.map((grant) => (
                  <li
                    key={grant.category_id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-black/5 bg-black/[0.035] px-3 py-2.5 text-sm dark:border-white/5 dark:bg-white/[0.035]"
                  >
                    <span className="truncate font-medium">
                      {categoryNames.get(grant.category_id) ??
                        "Unknown category"}
                    </span>
                    <IconButton
                      label={`Remove access to “${categoryNames.get(grant.category_id) ?? "category"}”`}
                      variant="danger"
                      onClick={() =>
                        void removeCategoryGrant(grant.category_id)
                      }
                    >
                      <FiTrash2 />
                    </IconButton>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-black/15 px-4 py-6 text-center text-sm text-black/60 dark:border-white/15 dark:text-white/60">
                This group has no restricted category access.
              </div>
            )}
          </Card>
          <Card className="flex flex-col items-start gap-4 border-red-500/25 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Delete access group</h2>
              <p className="mt-1 text-sm text-black/65 dark:text-white/65">
                Members relying on this group may immediately lose project
                access.
              </p>
            </div>
            <Button
              variant="danger"
              leftIcon={<FiTrash2 />}
              className="w-full sm:w-auto"
              onClick={() => setDeleteOpen(true)}
            >
              Delete group
            </Button>
          </Card>
        </div>
      </WorkspacePageShell>
      {projectCreateOpen && (
        <ProjectsModal
          modal={{ open: true, setOpen: setProjectCreateOpen }}
          workspace={{ data, setData, demoMode: false }}
          options={{ createOnly: true }}
        />
      )}
      {categoryCreateOpen && (
        <CategoriesModal
          modal={{ open: true, setOpen: setCategoryCreateOpen }}
          workspace={{ data, setData, demoMode: false }}
          options={{ createOnly: true }}
        />
      )}
      <ConfirmationDialog
        open={deleteOpen}
        setOpen={setDeleteOpen}
        title="Delete access group?"
        description={`This removes ${group.name} and every project grant attached to it.`}
        confirmLabel="Delete group"
        destructive
        onConfirm={deleteGroup}
      />
    </>
  );
}
