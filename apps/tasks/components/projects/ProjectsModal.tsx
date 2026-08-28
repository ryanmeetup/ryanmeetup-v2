"use client";

import {
  useMemo,
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  Avatar,
  Button,
  ConfirmationDialog,
  FilterChip,
  IconButton,
  Modal,
  ModalActions,
  PendingResults,
  Pill,
  SearchInput,
  toast,
  Tooltip,
} from "@ryanmeetup/ui";
import {
  FiArchive,
  FiArrowRight,
  FiChevronDown,
  FiEdit2,
  FiPlus,
  FiRotateCcw,
  FiLock,
  FiStar,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import { useQueryParamState, useSearchFilter } from "@ryanmeetup/hooks";
import { withAccessPreview } from "@/lib/access/access-preview";
import { mutate } from "@/lib/mutation-client";
import {
  CountBadge,
  ManagementCard,
  ManagementCardTitle,
  ResourceOwnerSelect,
} from "@/components/global";
import { errorMessage } from "@/lib/presentation";
import type { Project } from "@/lib/resources/resource-types";
import {
  defaultProjectStatus,
  groupProjectsByStatus,
  shouldOfferProjectArchive,
} from "@/lib/resources/project-status";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import {
  ExpandableResourceEditor,
  FormSection,
  ResourceFields,
  useResourceModalState,
  useResourceMutations,
  useResourceEditState,
  ResourceLinks,
} from "@/components/resources";
import {
  archiveFilter,
  filterAndSortResources,
  resourceSearchText,
  sameIds,
  type ArchiveFilter,
} from "@/lib/resources/resource-management";
import {
  ProjectAccessFields,
  type ProjectAccessGroup,
} from "./ProjectAccessFields";
import { ProjectStatusField } from "./ProjectStatusField";

export type ProjectsModalProps = {
  modal: {
    open: boolean;
    setOpen: (open: boolean) => void;
  };
  workspace: {
    data: WorkspaceData;
    setData: Dispatch<SetStateAction<WorkspaceData>>;
    demoMode: boolean;
  };
  options?: {
    embedded?: boolean;
    createOnly?: boolean;
    editProjectId?: string | null;
    readOnly?: boolean;
    showOwnerNames?: boolean;
    initialDraft?: { name?: string; description?: string } | null;
  };
  events?: {
    onCreate?: () => void;
    onProjectUpdated?: (project: Project) => void;
    onCreated?: (project: Project) => void | Promise<void>;
  };
};

// "Active" now names a lifecycle status, so the archive filter says "ongoing"
// for the projects it keeps: everything that has not been archived, whatever
// its status.
const archiveFilterLabels: Record<ArchiveFilter, string> = {
  active: "ongoing",
  archived: "archived",
  all: "all",
};

export function ProjectsModal({
  modal,
  workspace,
  options,
  events,
}: ProjectsModalProps) {
  const { open, setOpen } = modal;
  const { data, setData, demoMode } = workspace;
  const {
    embedded = false,
    createOnly = false,
    editProjectId = null,
    readOnly = false,
    showOwnerNames = false,
    initialDraft = null,
  } = options ?? {};
  const { onCreate, onProjectUpdated, onCreated } = events ?? {};
  const resourceMutations = useResourceMutations("project");
  const directEditProject = editProjectId
    ? (data.projects.find((project) => project.id === editProjectId) ?? null)
    : null;
  const createState = useResourceModalState(
    data.currentProfile.id,
    initialDraft ?? undefined,
  );
  const {
    name,
    description,
    links,
    attachments,
    ownerIds: newOwnerIds,
  } = createState.draft;
  const {
    setName,
    setDescription,
    setLinks,
    setAttachments,
    setOwnerIds: setNewOwnerIds,
  } = createState.changes;
  const {
    creating,
    setCreating,
    detailsOpen: createDetailsOpen,
    setDetailsOpen: setCreateDetailsOpen,
  } = createState;
  const [accessGroups, setAccessGroups] = useState<ProjectAccessGroup[]>([]);
  const [newAccessMode, setNewAccessMode] =
    useState<Project["access_mode"]>("owners");
  const [newAccessGroupIds, setNewAccessGroupIds] = useState<string[]>([]);
  const [newStatus, setNewStatus] = useState(defaultProjectStatus);
  const [editingAccessMode, setEditingAccessMode] =
    useState<Project["access_mode"]>("owners");
  const [editingAccessGroupIds, setEditingAccessGroupIds] = useState<string[]>(
    [],
  );
  const [savedAccessMode, setSavedAccessMode] =
    useState<Project["access_mode"]>("owners");
  const [savedAccessGroupIds, setSavedAccessGroupIds] = useState<string[]>([]);
  const [editingStatus, setEditingStatus] = useState(
    directEditProject?.status ?? defaultProjectStatus,
  );
  const [accessLoaded, setAccessLoaded] = useState(demoMode);
  const [projectStatusParam, setProjectStatus] = useQueryParamState(
    "project-status",
    "active",
  );
  const projectStatus = archiveFilter(projectStatusParam);
  const editState = useResourceEditState(
    directEditProject,
    directEditProject
      ? data.projectOwners
          .filter((item) => item.project_id === directEditProject.id)
          .map((item) => item.profile_id)
      : [],
  );
  const {
    resourceId: editingProjectId,
    setResourceId: setEditingProjectId,
    detailsOpen: editDetailsOpen,
    setDetailsOpen: setEditDetailsOpen,
    saving: renaming,
    setSaving: setRenaming,
  } = editState;
  const {
    name: editingName,
    description: editingDescription,
    links: editingLinks,
    ownerIds: editingOwnerIds,
  } = editState.draft;
  const {
    setName: setEditingName,
    setDescription: setEditingDescription,
    setLinks: setEditingLinks,
    setOwnerIds: setEditingOwnerIds,
  } = editState.changes;
  const [supportingDetailsChanged, setSupportingDetailsChanged] =
    useState(false);
  const [favoritePendingIds, setFavoritePendingIds] = useState<Set<string>>(
    new Set(),
  );
  const [collapsedStatuses, setCollapsedStatuses] = useState<
    Set<Project["status"]>
  >(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [archivePromptTarget, setArchivePromptTarget] =
    useState<Project | null>(null);
  const [archivePending, setArchivePending] = useState(false);
  const {
    query: projectQuery,
    setQuery: setProjectQuery,
    filtered: searchedProjects,
    isPending: searchPending,
  } = useSearchFilter({
    data: data.projects,
    buildHaystack: resourceSearchText,
    queryParam: "project-search",
  });

  async function loadProjectAccess(projectId?: string) {
    const canManageProject =
      !projectId ||
      data.currentProfile.app_role === "owner" ||
      data.projectOwners.some(
        (owner) =>
          owner.project_id === projectId &&
          owner.profile_id === data.currentProfile.id,
      );
    if (demoMode || !canManageProject) return;
    setAccessLoaded(false);
    try {
      const result = await mutate<{
        groups: ProjectAccessGroup[];
        accessMode: Project["access_mode"];
        groupIds: string[];
      }>(
        projectId
          ? `/api/project-access?projectId=${encodeURIComponent(projectId)}`
          : "/api/project-access",
        { method: "GET" },
      );
      setAccessGroups(result.groups);
      if (projectId) {
        setEditingAccessMode(result.accessMode);
        setSavedAccessMode(result.accessMode);
        setEditingAccessGroupIds(result.groupIds);
        setSavedAccessGroupIds(result.groupIds);
      }
      setAccessLoaded(true);
    } catch (error) {
      toast.error(
        errorMessage(error, "Project access settings could not be loaded."),
      );
    }
  }

  useEffect(() => {
    const projectId = directEditProject?.id;
    const canLoad =
      data.currentProfile.app_role === "owner" ||
      Boolean(
        projectId &&
        data.projectOwners.some(
          (owner) =>
            owner.project_id === projectId &&
            owner.profile_id === data.currentProfile.id,
        ),
      );
    if (!open || !canLoad) return;
    // This effect synchronizes the editor with its external access API. The
    // loader intentionally marks that request pending before it fetches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProjectAccess(projectId);
    // The direct-edit target is fixed for the lifetime of this modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directEditProject?.id, open]);

  async function saveProjectAccess(
    projectId: string,
    accessMode: Project["access_mode"],
    groupIds: string[],
  ) {
    await mutate("/api/project-access", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        accessMode,
        groupIds: accessMode === "restricted" ? groupIds : [],
      }),
    });
  }

  async function addProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const projectName = name.trim();
    const projectDescription = description.trim();
    if (!projectName || !projectDescription || newOwnerIds.length === 0) {
      toast.error("Add a project name, description, and at least one owner.");
      return;
    }
    if (newAccessMode === "restricted" && newAccessGroupIds.length === 0) {
      toast.error("Choose at least one access group.");
      return;
    }
    setCreating(true);
    try {
      let project: Project = {
        id: crypto.randomUUID(),
        name: projectName,
        description: projectDescription,
        links,
        created_by: data.currentProfile.id,
        archived_at: null,
        created_at: new Date().toISOString(),
        status: newStatus,
        access_mode: newAccessMode,
      };
      if (!demoMode)
        project = (
          await resourceMutations.save("POST", {
            name: projectName,
            description: projectDescription,
            links,
            ownerIds: newOwnerIds,
            accessMode: newAccessMode,
            accessGroupIds:
              newAccessMode === "restricted" ? newAccessGroupIds : [],
            status: newStatus,
          })
        ).project!;
      if (!demoMode && attachments.length > 0) {
        const failedAttachments = await resourceMutations.uploadDrafts(
          attachments,
          project.id,
        );
        if (failedAttachments > 0)
          toast.error(
            `${failedAttachments} ${failedAttachments === 1 ? "attachment" : "attachments"} could not be added. You can retry from Edit project.`,
          );
      }
      setData((current) => ({
        ...current,
        projects: [...current.projects, project],
        projectOwners: [
          ...current.projectOwners,
          ...newOwnerIds.map((profile_id) => ({
            project_id: project.id,
            profile_id,
          })),
        ],
      }));
      createState.reset();
      setNewAccessMode("owners");
      setNewAccessGroupIds([]);
      setNewStatus(defaultProjectStatus);
      toast.success(`${project.name} created.`);
      await onCreated?.(project);
      if (createOnly) setOpen(false);
    } catch (error) {
      toast.error(errorMessage(error, "The project could not be created."));
    } finally {
      setCreating(false);
    }
  }

  async function updateProject(project: Project, nextName: string) {
    if (!nextName) return;
    const nextDescription = editingDescription.trim();
    if (!nextDescription || editingOwnerIds.length === 0) {
      toast.error("Add a description and at least one project owner.");
      return;
    }
    if (
      editingAccessMode === "restricted" &&
      editingAccessGroupIds.length === 0
    ) {
      toast.error("Choose at least one access group.");
      return;
    }
    const currentOwnerIds = data.projectOwners
      .filter((item) => item.project_id === project.id)
      .map((item) => item.profile_id);
    const ownersChanged = !sameIds(currentOwnerIds, editingOwnerIds);
    setRenaming(true);
    try {
      if (!demoMode)
        await resourceMutations.save("PATCH", {
          id: project.id,
          name: nextName,
          description: nextDescription,
          links: editingLinks,
          status: editingStatus,
          ...(ownersChanged ? { ownerIds: editingOwnerIds } : {}),
        });
      if (
        !demoMode &&
        (data.currentProfile.app_role === "owner" ||
          currentOwnerIds.includes(data.currentProfile.id))
      )
        await saveProjectAccess(
          project.id,
          editingAccessMode,
          editingAccessGroupIds,
        );
      const updatedProject = {
        ...project,
        name: nextName,
        description: nextDescription,
        links: editingLinks,
        status: editingStatus,
        access_mode: editingAccessMode,
      };
      onProjectUpdated?.(updatedProject);
      setData((current) => ({
        ...current,
        projects: current.projects.map((item) =>
          item.id === project.id ? updatedProject : item,
        ),
        projectOwners: ownersChanged
          ? [
              ...current.projectOwners.filter(
                (item) => item.project_id !== project.id,
              ),
              ...editingOwnerIds.map((profile_id) => ({
                project_id: project.id,
                profile_id,
              })),
            ]
          : current.projectOwners,
      }));
      toast.success(`${nextName} updated.`);
      if (
        shouldOfferProjectArchive(
          project.status,
          editingStatus,
          project.archived_at,
        )
      ) {
        setArchivePromptTarget(updatedProject);
      }
      setSavedAccessMode(editingAccessMode);
      setSavedAccessGroupIds(editingAccessGroupIds);
      setSupportingDetailsChanged(false);
      setEditingProjectId(null);
      if (editProjectId) setOpen(false);
    } catch (error) {
      toast.error(
        errorMessage(error, "The project changes could not all be saved."),
      );
    } finally {
      setRenaming(false);
    }
  }

  function beginRename(project: Project) {
    setSupportingDetailsChanged(false);
    editState.begin(
      project,
      data.projectOwners
        .filter((item) => item.project_id === project.id)
        .map((item) => item.profile_id),
    );
    setEditingAccessMode(project.access_mode);
    setSavedAccessMode(project.access_mode);
    setEditingAccessGroupIds([]);
    setSavedAccessGroupIds([]);
    setEditingStatus(project.status);
    setAccessLoaded(demoMode);
    void loadProjectAccess(project.id);
  }

  function closeEditor() {
    setSupportingDetailsChanged(false);
    if (editState.close() && editProjectId) setOpen(false);
  }

  async function toggleArchived(project: Project) {
    const archived = !project.archived_at;
    try {
      if (!demoMode)
        await resourceMutations.save("PATCH", { id: project.id, archived });
      setData((current) => ({
        ...current,
        projects: current.projects.map((item) =>
          item.id === project.id
            ? {
                ...item,
                archived_at: archived ? new Date().toISOString() : null,
              }
            : item,
        ),
      }));
      toast.success(`${project.name} ${archived ? "archived" : "restored"}.`);
      return true;
    } catch (error) {
      toast.error(errorMessage(error, "The project could not be updated."));
      return false;
    }
  }

  async function archiveCompletedProject() {
    if (!archivePromptTarget) return;
    setArchivePending(true);
    const archived = await toggleArchived(archivePromptTarget);
    setArchivePending(false);
    if (archived) setArchivePromptTarget(null);
  }

  async function deleteProject() {
    if (!deleteTarget) return;
    const project = deleteTarget;
    setDeletePending(true);
    try {
      if (!demoMode) await resourceMutations.save("DELETE", { id: project.id });
      setData((current) => ({
        ...current,
        projects: current.projects.filter((item) => item.id !== project.id),
        projectOwners: current.projectOwners.filter(
          (item) => item.project_id !== project.id,
        ),
        currentProfile: {
          ...current.currentProfile,
          favorite_project_ids: (
            current.currentProfile.favorite_project_ids ?? []
          ).filter((id) => id !== project.id),
        },
      }));
      setDeleteTarget(null);
      toast.success(`${project.name} deleted.`);
    } catch (error) {
      toast.error(errorMessage(error, "The project could not be deleted."));
    } finally {
      setDeletePending(false);
    }
  }

  async function toggleFavorite(project: Project) {
    const currentFavoriteIds = data.currentProfile.favorite_project_ids ?? [];
    const favorite = !currentFavoriteIds.includes(project.id);
    setFavoritePendingIds((current) => new Set(current).add(project.id));
    try {
      let favoriteProjectIds = favorite
        ? [...currentFavoriteIds, project.id]
        : currentFavoriteIds.filter((projectId) => projectId !== project.id);
      if (!demoMode) {
        const response = await fetch("/api/profile/favorite-projects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, favorite }),
        });
        const result = (await response.json()) as {
          error?: string;
          favoriteProjectIds?: string[];
        };
        if (!response.ok || !result.favoriteProjectIds) {
          throw new Error(result.error ?? "Your favorite could not be saved.");
        }
        favoriteProjectIds = result.favoriteProjectIds;
      }
      setData((current) => ({
        ...current,
        currentProfile: {
          ...current.currentProfile,
          favorite_project_ids: favoriteProjectIds,
        },
      }));
      toast.success(
        `${project.name} ${favorite ? "added to" : "removed from"} favorites.`,
      );
    } catch (error) {
      toast.error(errorMessage(error, "Your favorite could not be saved."));
    } finally {
      setFavoritePendingIds((current) => {
        const next = new Set(current);
        next.delete(project.id);
        return next;
      });
    }
  }

  const projects = useMemo(
    () => filterAndSortResources(searchedProjects, projectStatus),
    [projectStatus, searchedProjects],
  );
  const projectGroups = useMemo(
    () => groupProjectsByStatus(projects),
    [projects],
  );

  function setStatusCollapsed(status: Project["status"], collapsed: boolean) {
    setCollapsedStatuses((current) => {
      if (current.has(status) === collapsed) return current;
      const next = new Set(current);
      if (collapsed) next.add(status);
      else next.delete(status);
      return next;
    });
  }

  function renderProjectCard(project: Project) {
    const taskCount =
      data.projectTaskCounts?.[project.id] ??
      data.tasks.filter((task) => task.project_id === project.id).length;
    const isFavorite = (
      data.currentProfile.favorite_project_ids ?? []
    ).includes(project.id);
    const owners = data.projectOwners
      .filter((item) => item.project_id === project.id)
      .flatMap((item) => {
        const profile = data.profiles.find(
          (candidate) => candidate.id === item.profile_id,
        );
        return profile ? [profile] : [];
      });
    return (
      <ManagementCard
        key={project.id}
        className={
          isFavorite
            ? "min-w-0 overflow-hidden border-amber-500/40 bg-amber-400/10 shadow-sm shadow-amber-900/5 dark:border-amber-400/35 dark:bg-amber-300/[0.08] dark:shadow-none"
            : "min-w-0 overflow-hidden"
        }
        body={
          project.description || (project.links ?? []).length ? (
            <div className="min-w-0">
              {project.description && (
                <p className="break-words text-sm text-black/60 dark:text-white/60">
                  {project.description}
                </p>
              )}
              {(project.links ?? []).length > 0 && (
                <ResourceLinks
                  links={project.links}
                  className={`mt-2 ${embedded ? "mb-4" : ""}`}
                />
              )}
            </div>
          ) : undefined
        }
        footerClassName="flex-wrap justify-start"
        footer={
          <>
            {owners.length > 0 ? (
              <div
                className="flex shrink-0 -space-x-2"
                aria-label={`${owners.length} ${owners.length === 1 ? "owner" : "owners"}`}
              >
                {owners.slice(0, 3).map((owner) => (
                  <Tooltip
                    key={owner.id}
                    content={owner.full_name}
                    placement="top"
                  >
                    <Avatar
                      name={owner.full_name}
                      src={owner.avatar_url}
                      size="md"
                      className="ring-2 ring-white dark:ring-[#181818]"
                    />
                  </Tooltip>
                ))}
                {owners.length > 3 && (
                  <Tooltip
                    content={owners
                      .slice(3)
                      .map((owner) => owner.full_name)
                      .join(", ")}
                    placement="top"
                  >
                    <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-white bg-black text-[10px] font-bold text-white dark:border-[#181818] dark:bg-white dark:text-black">
                      +{owners.length - 3}
                    </span>
                  </Tooltip>
                )}
              </div>
            ) : (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-dashed border-black/25 text-black/40 dark:border-white/25 dark:text-white/40">
                <FiUsers aria-hidden size={14} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
                Owners
              </p>
              {owners.length === 0 && (
                <p className="truncate text-xs font-medium text-black/65 dark:text-white/65">
                  Unassigned
                </p>
              )}
              {showOwnerNames && owners.length > 0 && (
                <p
                  className="truncate text-xs font-medium text-black/65 dark:text-white/65"
                  title={owners.map((owner) => owner.full_name).join(", ")}
                >
                  {owners
                    .slice(0, 3)
                    .map((owner) => owner.full_name)
                    .join(", ")}
                  {owners.length > 3 ? ` +${owners.length - 3}` : ""}
                </p>
              )}
            </div>
            {embedded && (
              <Button.Link
                href={withAccessPreview(
                  `/board?project=${encodeURIComponent(project.name)}`,
                  data.accessPreview,
                )}
                variant="secondary"
                size="sm"
                className="w-full justify-center sm:ml-auto sm:w-auto"
                rightIcon={<FiArrowRight aria-hidden />}
              >
                Open board
              </Button.Link>
            )}
          </>
        }
      >
        <div className="min-w-0 flex-1 py-1">
          <ManagementCardTitle
            className={
              project.archived_at
                ? "text-black/60 dark:text-white/60"
                : undefined
            }
          >
            <span className="inline-flex min-w-0 max-w-full items-center gap-2">
              <span className="min-w-0 truncate">{project.name}</span>
              <Tooltip
                content={`${taskCount} ${taskCount === 1 ? "task" : "tasks"} in this project`}
                placement="top"
              >
                <CountBadge label="task" className="shrink-0">
                  {taskCount}
                </CountBadge>
              </Tooltip>
            </span>
          </ManagementCardTitle>
        </div>
        {project.archived_at && (
          <Pill
            variant="neutral"
            size="sm"
            className="shrink-0 !px-2.5 !tracking-[0.16em]"
          >
            Archived
          </Pill>
        )}
        {!data.accessPreview && !project.archived_at && (
          <IconButton
            label={`${isFavorite ? "Remove" : "Add"} “${project.name}” ${isFavorite ? "from" : "to"} favorites`}
            disabled={favoritePendingIds.has(project.id)}
            onClick={() => void toggleFavorite(project)}
            className={
              isFavorite
                ? "!border-amber-500/35 !bg-amber-400/15 !text-amber-700 hover:!bg-amber-400/25 dark:!border-amber-300/30 dark:!bg-amber-300/10 dark:!text-amber-200 dark:hover:!bg-amber-300/20"
                : undefined
            }
          >
            <FiStar fill={isFavorite ? "currentColor" : "none"} />
          </IconButton>
        )}
        {!readOnly && (
          <>
            <IconButton
              label={`Edit “${project.name}”`}
              variant="edit"
              onClick={() => beginRename(project)}
            >
              <FiEdit2 />
            </IconButton>
            {taskCount > 0 ? (
              <IconButton
                label={`${project.archived_at ? "Restore" : "Archive"} “${project.name}”`}
                variant="archive"
                onClick={() => void toggleArchived(project)}
              >
                {project.archived_at ? <FiRotateCcw /> : <FiArchive />}
              </IconButton>
            ) : (
              <IconButton
                label={`Delete “${project.name}”`}
                variant="danger"
                onClick={() => setDeleteTarget(project)}
              >
                <FiTrash2 />
              </IconButton>
            )}
          </>
        )}
      </ManagementCard>
    );
  }

  const createProjectPrimaryFields = (
    <ResourceFields
      section="primary"
      resource={{ kind: "project" }}
      values={{ name, description, ownerIds: newOwnerIds, links, attachments }}
      changes={{
        setName,
        setDescription,
        setOwnerIds: setNewOwnerIds,
        setLinks,
        setAttachments,
      }}
      editor={{
        disabled: creating,
        demoMode,
        currentUserId: data.currentProfile.id,
        profiles: data.profiles,
      }}
      copy={{
        nameLabel: "New Project",
        namePlaceholder: "Website refresh",
        descriptionPlaceholder: "What is this project working toward?",
      }}
      hideOwners
      primarySlot={
        <div className="space-y-4">
          <ProjectStatusField
            value={newStatus}
            onChange={setNewStatus}
            disabled={creating}
          />
          <FormSection
            title="Who can use it"
            description="Project owners always retain access. Members of selected groups can see the project and work on its tasks."
            icon={<FiLock className="h-4 w-4" />}
          >
            <ProjectAccessFields
              groups={accessGroups}
              accessMode={newAccessMode}
              groupIds={newAccessGroupIds}
              onAccessModeChange={setNewAccessMode}
              onGroupIdsChange={setNewAccessGroupIds}
              disabled={creating || !accessLoaded}
              loaded={accessLoaded}
              owner={data.currentProfile.app_role === "owner"}
            />
            <ResourceOwnerSelect
              label="Project owners"
              profiles={data.profiles}
              value={newOwnerIds}
              onChange={setNewOwnerIds}
              disabled={creating}
            />
          </FormSection>
        </div>
      }
    />
  );
  const createProjectSecondaryFields = (
    <ResourceFields
      section="supporting"
      resource={{ kind: "project" }}
      values={{ name, description, ownerIds: newOwnerIds, links, attachments }}
      changes={{
        setName,
        setDescription,
        setOwnerIds: setNewOwnerIds,
        setLinks,
        setAttachments,
      }}
      editor={{
        disabled: creating,
        demoMode,
        currentUserId: data.currentProfile.id,
        profiles: data.profiles,
      }}
      copy={{
        nameLabel: "New Project",
        namePlaceholder: "Website refresh",
        descriptionPlaceholder: "What is this project working toward?",
      }}
    />
  );
  return (
    <>
      <Modal
        open={open && !editProjectId}
        setIsOpen={setOpen}
        title={
          createOnly ? (
            "New Project"
          ) : (
            <>
              Projects <CountBadge size="lg">{projects.length}</CountBadge>
            </>
          )
        }
        description={
          embedded
            ? "Projects collect related work across categories. Set owners and access groups while creating or editing each work stream."
            : undefined
        }
        actions={
          embedded && onCreate && !readOnly ? (
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              leftIcon={<FiPlus aria-hidden />}
              onClick={onCreate}
            >
              New project
            </Button>
          ) : !embedded ? (
            <ModalActions
              confirmForm="create-project-form"
              confirmLabel="Create project"
              onCancel={() => setOpen(false)}
              pending={creating}
              pendingLabel="Creating..."
            />
          ) : undefined
        }
        size={
          createOnly && createDetailsOpen ? "2xl" : createOnly ? "lg" : "xl"
        }
        panelClassName={
          createOnly
            ? "transition-[max-width] duration-300 ease-out motion-reduce:transition-none"
            : undefined
        }
        embedded={embedded}
        footerContent={
          !embedded && !createOnly ? (
            <form
              id="create-project-form"
              className="grid gap-4"
              onSubmit={addProject}
            >
              <ExpandableResourceEditor
                expanded={createDetailsOpen}
                setExpanded={setCreateDetailsOpen}
                primary={createProjectPrimaryFields}
                secondary={createProjectSecondaryFields}
              />
            </form>
          ) : undefined
        }
      >
        {createOnly ? (
          <form
            id="create-project-form"
            className="space-y-4"
            onSubmit={addProject}
          >
            <p className="text-sm text-black/60 dark:text-white/60">
              Give the work a clear home and choose who can use it from the
              start.
            </p>
            <ExpandableResourceEditor
              expanded={createDetailsOpen}
              setExpanded={setCreateDetailsOpen}
              primary={createProjectPrimaryFields}
              secondary={createProjectSecondaryFields}
            />
          </form>
        ) : (
          <>
            {!embedded && (
              <p className="mb-5 text-sm text-black/60 dark:text-white/60">
                Projects collect related work across categories. Owners show who
                is driving each work stream, and access groups control who can
                view or change it.
              </p>
            )}
            <div className="sticky top-0 z-20 -mx-1 mb-4 grid gap-3 bg-white px-1 pb-3 dark:bg-[#181818] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <SearchInput
                label="Search projects"
                name="project-search"
                value={projectQuery}
                onChange={(event) => setProjectQuery(event.target.value)}
                placeholder="Search projects..."
                pending={searchPending}
                pendingLabel="Loading project results"
              />
              <div
                className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap"
                aria-label="Filter projects"
              >
                {(["active", "archived", "all"] as const).map((status) => (
                  <FilterChip
                    key={status}
                    active={projectStatus === status}
                    onClick={() => setProjectStatus(status)}
                    className="h-10 w-full justify-center px-2 py-0 sm:w-auto sm:px-4"
                  >
                    {archiveFilterLabels[status]}
                  </FilterChip>
                ))}
              </div>
            </div>
            <PendingResults pending={searchPending} label="Loading projects">
              {projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-black/55 dark:border-white/10 dark:text-white/55">
                  No projects match this search and filter.
                </div>
              ) : (
                <div className="grid min-w-0 gap-8">
                  {projectGroups.map((group) => (
                    <details
                      key={group.value}
                      open={!collapsedStatuses.has(group.value)}
                      onToggle={(event) =>
                        setStatusCollapsed(
                          group.value,
                          !event.currentTarget.open,
                        )
                      }
                      className="details-reveal group min-w-0"
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-2 border-b border-black/10 pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 dark:border-white/10 dark:focus-visible:ring-white/30 [&::-webkit-details-marker]:hidden">
                        <span
                          aria-hidden
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-black/55 dark:text-white/55">
                          {group.label}
                        </h3>
                        <CountBadge>{group.projects.length}</CountBadge>
                        <FiChevronDown
                          aria-hidden
                          className="ml-auto shrink-0 text-black/40 transition-transform group-open:-rotate-180 motion-reduce:transition-none dark:text-white/40"
                        />
                      </summary>
                      <div
                        className={`grid min-w-0 grid-cols-1 items-stretch gap-4 pt-3 md:grid-cols-2 ${embedded ? "lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3" : ""}`}
                      >
                        {group.projects.map((project) =>
                          renderProjectCard(project),
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </PendingResults>
          </>
        )}
      </Modal>
      {editingProjectId &&
        (() => {
          const project = data.projects.find(
            (item) => item.id === editingProjectId,
          );
          if (!project) return null;
          const savedOwnerIds = data.projectOwners
            .filter((item) => item.project_id === project.id)
            .map((item) => item.profile_id);
          const projectChanged =
            editingName.trim() !== project.name ||
            editingDescription.trim() !== (project.description ?? "") ||
            editingStatus !== project.status ||
            JSON.stringify(editingLinks) !==
              JSON.stringify(project.links ?? []) ||
            supportingDetailsChanged ||
            !sameIds(savedOwnerIds, editingOwnerIds) ||
            savedAccessMode !== editingAccessMode ||
            !sameIds(savedAccessGroupIds, editingAccessGroupIds);
          return (
            <Modal
              open
              setIsOpen={(nextOpen) => {
                if (!nextOpen) closeEditor();
              }}
              title={`Edit ${project.name}`}
              size={editDetailsOpen ? "2xl" : "lg"}
              panelClassName="transition-[max-width] duration-300 ease-out motion-reduce:transition-none"
              actions={
                <ModalActions
                  confirmDisabled={!projectChanged}
                  confirmForm={`edit-project-form-${project.id}`}
                  confirmLabel="Save changes"
                  confirmTooltip="Make a change before saving."
                  onCancel={closeEditor}
                  pending={renaming}
                  pendingLabel="Saving..."
                />
              }
            >
              <form
                id={`edit-project-form-${project.id}`}
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void updateProject(project, editingName.trim());
                }}
              >
                <ExpandableResourceEditor
                  expanded={editDetailsOpen}
                  setExpanded={setEditDetailsOpen}
                  primary={
                    <ResourceFields
                      section="primary"
                      resource={{ kind: "project", id: project.id }}
                      values={{
                        name: editingName,
                        description: editingDescription,
                        ownerIds: editingOwnerIds,
                        links: editingLinks,
                      }}
                      changes={{
                        setName: setEditingName,
                        setDescription: setEditingDescription,
                        setOwnerIds: setEditingOwnerIds,
                        setLinks: setEditingLinks,
                      }}
                      editor={{
                        disabled: renaming,
                        demoMode,
                        currentUserId: data.currentProfile.id,
                        profiles: data.profiles,
                      }}
                      copy={{
                        nameLabel: "Project name",
                        namePlaceholder: "Project name",
                        descriptionPlaceholder:
                          "What is this project working toward?",
                      }}
                      hideOwners
                      primarySlot={
                        <div className="space-y-4">
                          <ProjectStatusField
                            value={editingStatus}
                            onChange={setEditingStatus}
                            disabled={renaming}
                          />
                          <FormSection
                            title="Who can use it"
                            description="Project owners always retain access. Members of selected groups can see the project and work on its tasks."
                            icon={<FiLock className="h-4 w-4" />}
                          >
                            <ProjectAccessFields
                              groups={accessGroups}
                              accessMode={editingAccessMode}
                              groupIds={editingAccessGroupIds}
                              onAccessModeChange={setEditingAccessMode}
                              onGroupIdsChange={setEditingAccessGroupIds}
                              disabled={renaming || !accessLoaded}
                              loaded={accessLoaded}
                              owner={
                                data.currentProfile.app_role === "owner" ||
                                editingOwnerIds.includes(data.currentProfile.id)
                              }
                            />
                            <ResourceOwnerSelect
                              label="Project owners"
                              profiles={data.profiles}
                              value={editingOwnerIds}
                              onChange={setEditingOwnerIds}
                              disabled={renaming}
                            />
                          </FormSection>
                        </div>
                      }
                    />
                  }
                  secondary={
                    <ResourceFields
                      section="supporting"
                      resource={{ kind: "project", id: project.id }}
                      values={{
                        name: editingName,
                        description: editingDescription,
                        ownerIds: editingOwnerIds,
                        links: editingLinks,
                      }}
                      changes={{
                        setName: setEditingName,
                        setDescription: setEditingDescription,
                        setOwnerIds: setEditingOwnerIds,
                        setLinks: setEditingLinks,
                      }}
                      editor={{
                        disabled: renaming,
                        demoMode,
                        currentUserId: data.currentProfile.id,
                        profiles: data.profiles,
                        onSupportingMutation: () =>
                          setSupportingDetailsChanged(true),
                      }}
                      copy={{
                        nameLabel: "Project name",
                        namePlaceholder: "Project name",
                        descriptionPlaceholder:
                          "What is this project working toward?",
                      }}
                    />
                  }
                />
              </form>
            </Modal>
          );
        })()}
      <ConfirmationDialog
        open={Boolean(archivePromptTarget)}
        setOpen={(nextOpen) =>
          !nextOpen && !archivePending && setArchivePromptTarget(null)
        }
        title="Archive this completed project?"
        description={`“${archivePromptTarget?.name ?? "This project"}” is now complete. Would you like to archive it?`}
        confirmLabel="Archive project"
        pendingLabel="Archiving project..."
        pending={archivePending}
        onConfirm={() => void archiveCompletedProject()}
      />
      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        setOpen={(nextOpen) =>
          !nextOpen && !deletePending && setDeleteTarget(null)
        }
        title="Delete this project?"
        description={`This permanently removes “${deleteTarget?.name ?? "this project"}”. This cannot be undone.`}
        confirmLabel="Delete project"
        pendingLabel="Deleting project..."
        pending={deletePending}
        destructive
        onConfirm={() => void deleteProject()}
      />
    </>
  );
}
