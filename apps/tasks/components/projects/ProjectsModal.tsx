"use client";

import {
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  Button,
  Avatar,
  DisclosureCard,
  FilterChip,
  IconButton,
  Input,
  Modal,
  MultiSelect,
  Textarea,
  Tooltip,
  toast,
} from "@ryanmeetup/ui";
import {
  FiArchive,
  FiArrowRight,
  FiEdit2,
  FiLoader,
  FiPlus,
  FiRotateCcw,
  FiSearch,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import { useSearchFilter } from "@ryanmeetup/hooks";
import { withAccessPreview } from "@/lib/access-preview";
import { normalizeProjectLinkUrl } from "@/lib/project-links";
import type { Project, ProjectLink, WorkspaceData } from "@/lib/types";
import { ProjectLinks } from "./ProjectLinks";
import { ProjectAttachments } from "./ProjectAttachments";
import type { ProjectAttachmentDraft } from "./ProjectAttachments";

export function ProjectsModal({
  open,
  setOpen,
  data,
  setData,
  demoMode,
  embedded = false,
  createOnly = false,
  editProjectId = null,
  readOnly = false,
  showOwnerNames = false,
  onCreate,
  onProjectUpdated,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  demoMode: boolean;
  embedded?: boolean;
  createOnly?: boolean;
  editProjectId?: string | null;
  readOnly?: boolean;
  showOwnerNames?: boolean;
  onCreate?: () => void;
  onProjectUpdated?: (project: Project) => void;
}) {
  const directEditProject = editProjectId
    ? (data.projects.find((project) => project.id === editProjectId) ?? null)
    : null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [attachments, setAttachments] = useState<ProjectAttachmentDraft[]>([]);
  const [creating, setCreating] = useState(false);
  const [projectStatus, setProjectStatus] = useState<
    "active" | "archived" | "all"
  >("active");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(
    directEditProject?.id ?? null,
  );
  const [editingName, setEditingName] = useState(directEditProject?.name ?? "");
  const [editingDescription, setEditingDescription] = useState(
    directEditProject?.description ?? "",
  );
  const [editingLinks, setEditingLinks] = useState<ProjectLink[]>(
    directEditProject?.links ?? [],
  );
  const [editingOwnerIds, setEditingOwnerIds] = useState<string[]>(
    directEditProject
      ? data.projectOwners
          .filter((item) => item.project_id === directEditProject.id)
          .map((item) => item.profile_id)
      : [],
  );
  const [renaming, setRenaming] = useState(false);
  const [newOwnerIds, setNewOwnerIds] = useState<string[]>([
    data.currentProfile.id,
  ]);
  const {
    query: projectQuery,
    setQuery: setProjectQuery,
    filtered: searchedProjects,
    isPending: searchPending,
  } = useSearchFilter({
    data: data.projects,
    buildHaystack: (project) =>
      `${project.name} ${project.description ?? ""} ${(project.links ?? []).map((link) => `${link.label} ${link.url}`).join(" ")}`.toLowerCase(),
    queryParam: "project-search",
  });

  async function request(
    body: Record<string, unknown>,
    method: "POST" | "PATCH",
  ) {
    const response = await fetch("/api/projects", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as {
      error?: string;
      project?: Project;
    };
    if (!response.ok)
      throw new Error(result.error ?? "The project could not be updated.");
    return result;
  }

  async function addProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const projectName = name.trim();
    const projectDescription = description.trim();
    if (!projectName || !projectDescription || newOwnerIds.length === 0) {
      toast.error("Add a project name, description, and at least one owner.");
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
      };
      if (!demoMode)
        project = (
          await request(
            {
              name: projectName,
              description: projectDescription,
              links,
              ownerIds: newOwnerIds,
            },
            "POST",
          )
        ).project!;
      if (!demoMode && attachments.length > 0) {
        let failedAttachments = 0;
        for (const attachment of attachments) {
          try {
            const body = attachment.file
              ? (() => {
                  const formData = new FormData();
                  formData.set("projectId", project.id);
                  formData.set("file", attachment.file);
                  return formData;
                })()
              : JSON.stringify({
                  projectId: project.id,
                  name: attachment.name,
                  body: attachment.body,
                });
            const response = await fetch("/api/project-attachments", {
              method: "POST",
              headers: attachment.file
                ? undefined
                : { "Content-Type": "application/json" },
              body,
            });
            if (!response.ok) failedAttachments += 1;
          } catch {
            failedAttachments += 1;
          }
        }
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
      setName("");
      setDescription("");
      setLinks([]);
      setAttachments([]);
      toast.success(`${project.name} created.`);
      if (createOnly) setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The project could not be created.",
      );
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
    const currentOwnerIds = data.projectOwners
      .filter((item) => item.project_id === project.id)
      .map((item) => item.profile_id);
    const ownersChanged =
      currentOwnerIds.length !== editingOwnerIds.length ||
      currentOwnerIds.some((ownerId) => !editingOwnerIds.includes(ownerId));
    setRenaming(true);
    try {
      if (!demoMode)
        await request(
          {
            id: project.id,
            name: nextName,
            description: nextDescription,
            links: editingLinks,
            ...(ownersChanged ? { ownerIds: editingOwnerIds } : {}),
          },
          "PATCH",
        );
      const updatedProject = {
        ...project,
        name: nextName,
        description: nextDescription,
        links: editingLinks,
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
      setEditingProjectId(null);
      if (editProjectId) setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The project could not be renamed.",
      );
    } finally {
      setRenaming(false);
    }
  }

  function beginRename(project: Project) {
    setEditingProjectId(project.id);
    setEditingName(project.name);
    setEditingDescription(project.description ?? "");
    setEditingLinks(project.links ?? []);
    setEditingOwnerIds(
      data.projectOwners
        .filter((item) => item.project_id === project.id)
        .map((item) => item.profile_id),
    );
  }

  function closeEditor() {
    if (renaming) return;
    setEditingProjectId(null);
    if (editProjectId) setOpen(false);
  }

  async function toggleArchived(project: Project) {
    const archived = !project.archived_at;
    try {
      if (!demoMode) await request({ id: project.id, archived }, "PATCH");
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
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The project could not be updated.",
      );
    }
  }

  const projects = useMemo(
    () =>
      [...searchedProjects]
        .filter((project) => {
          const matchesStatus =
            projectStatus === "all" ||
            (projectStatus === "archived"
              ? Boolean(project.archived_at)
              : !project.archived_at);
          return matchesStatus;
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [projectStatus, searchedProjects],
  );
  const ownerOptions = useMemo(
    () =>
      data.profiles.map((profile) => ({
        avatar: { name: profile.full_name, src: profile.avatar_url },
        label: profile.full_name,
        value: profile.id,
      })),
    [data.profiles],
  );
  const createProjectFields = (
    <>
      <Input
        label="New Project"
        name="project-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="RyanCon 2027"
        disabled={creating}
        required
      />
      <Textarea
        id="project-description"
        label="Description"
        name="project-description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="What is this project working toward?"
        rows={2}
        disabled={creating}
        required
      />
      <MultiSelect
        label="Project owners"
        options={ownerOptions}
        value={newOwnerIds}
        onChange={setNewOwnerIds}
        placeholder="Select owners"
        disabled={creating}
        required
      />
      <ProjectLinksFields
        links={links}
        setLinks={setLinks}
        disabled={creating}
      />
      <ProjectAttachments
        demoMode={demoMode}
        disabled={creating}
        currentUserId={data.currentProfile.id}
        drafts={attachments}
        onDraftsChange={setAttachments}
      />
    </>
  );
  return (
    <>
      <Modal
        open={open && !editProjectId}
        setIsOpen={setOpen}
        title={createOnly ? "New Project" : "Projects"}
        description={
          embedded
            ? "Projects collect related work across categories. Owners show who is driving each work stream; project access is still managed separately through groups."
            : undefined
        }
        actions={
          embedded && onCreate && !readOnly ? (
            <Button
              type="button"
              variant="action"
              size="sm"
              leftIcon={<FiPlus aria-hidden />}
              onClick={onCreate}
            >
              New project
            </Button>
          ) : undefined
        }
        hideActions
        size={createOnly ? "lg" : "xl"}
        embedded={embedded}
        maxHeight="min(42rem, calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom))))"
        footer={
          embedded ? undefined : createOnly ? (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-project-form"
                variant="action"
                size="sm"
                loading={creating}
                loadingText="Creating..."
              >
                Create project
              </Button>
            </div>
          ) : (
            <form
              id="create-project-form"
              className="grid gap-4"
              onSubmit={addProject}
            >
              {createProjectFields}
              <div className="flex justify-end gap-2 border-t border-black/10 pt-4 dark:border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="action"
                  size="sm"
                  loading={creating}
                  loadingText="Creating..."
                >
                  Create project
                </Button>
              </div>
            </form>
          )
        }
      >
        {createOnly ? (
          <form
            id="create-project-form"
            className="space-y-4"
            onSubmit={addProject}
          >
            <p className="text-sm text-black/60 dark:text-white/60">
              Give the work a clear home. Assign access groups from Access &
              permissions afterward.
            </p>
            {createProjectFields}
          </form>
        ) : (
          <>
            {!embedded && (
              <p className="mb-5 text-sm text-black/60 dark:text-white/60">
                Projects collect related work across categories. Owners show who
                is driving each work stream; project access is still managed
                separately through groups.
              </p>
            )}
            <div className="sticky top-0 z-20 -mx-1 mb-4 grid gap-3 bg-white px-1 pb-3 dark:bg-[#181818] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="relative">
                <Input
                  label="Search projects"
                  name="project-search"
                  hideLabel
                  leadingIcon={<FiSearch aria-hidden />}
                  aria-busy={searchPending}
                  value={projectQuery}
                  onChange={(event) => setProjectQuery(event.target.value)}
                  placeholder="Search projects..."
                  inputClassName="pr-10"
                />
                {searchPending && (
                  <span
                    role="status"
                    aria-label="Loading project results"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/45 dark:text-white/45"
                  >
                    <FiLoader className="animate-spin motion-reduce:animate-none" />
                  </span>
                )}
              </div>
              <div
                className="flex flex-wrap gap-2"
                aria-label="Filter projects"
              >
                {(["active", "archived", "all"] as const).map((status) => (
                  <FilterChip
                    key={status}
                    active={projectStatus === status}
                    onClick={() => setProjectStatus(status)}
                    className="h-10 px-4 py-0"
                  >
                    {status}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div className="relative" aria-busy={searchPending}>
              {searchPending && (
                <div
                  role="status"
                  aria-label="Loading project results"
                  className="absolute inset-0 z-10 grid min-h-40 place-items-center rounded-xl bg-white/80 backdrop-blur-sm dark:bg-[#181818]/80"
                >
                  <span className="flex items-center gap-3 rounded-xl border border-black/15 bg-white px-5 py-3 text-sm font-semibold shadow-lg dark:border-white/15 dark:bg-[#181818]">
                    <FiLoader className="h-5 w-5 animate-spin motion-reduce:animate-none" />
                    Loading projects
                  </span>
                </div>
              )}
              <div
                className={`${searchPending ? "pointer-events-none opacity-55" : ""} grid items-stretch gap-4 transition-opacity md:grid-cols-2 ${embedded ? "xl:grid-cols-3" : ""}`}
              >
                {projects.map((project) => {
                  const owners = data.projectOwners
                    .filter((item) => item.project_id === project.id)
                    .flatMap((item) => {
                      const profile = data.profiles.find(
                        (candidate) => candidate.id === item.profile_id,
                      );
                      return profile ? [profile] : [];
                    });
                  return (
                    <div
                      key={project.id}
                      className="flex h-full flex-col rounded-xl border border-black/10 bg-black/[0.015] px-4 py-3 dark:border-white/10 dark:bg-white/[0.025]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1 py-1">
                          <span
                            className={`block truncate font-semibold ${project.archived_at ? "text-black/45 line-through dark:text-white/45" : ""}`}
                          >
                            {project.name}
                          </span>
                          {project.description && (
                            <span className="mt-0.5 block line-clamp-2 text-xs text-black/60 dark:text-white/60">
                              {project.description}
                            </span>
                          )}
                          {(project.links ?? []).length > 0 && (
                            <ProjectLinks
                              links={project.links}
                              className={`mt-2 ${embedded ? "mb-4" : ""}`}
                            />
                          )}
                        </div>
                        {project.archived_at && (
                          <span className="mt-2 hidden text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45 sm:inline">
                            Archived
                          </span>
                        )}
                        {!readOnly && (
                          <>
                            <IconButton
                              label={`Edit ${project.name}`}
                              onClick={() => beginRename(project)}
                            >
                              <FiEdit2 />
                            </IconButton>
                            <IconButton
                              label={`${project.archived_at ? "Restore" : "Archive"} ${project.name}`}
                              onClick={() => void toggleArchived(project)}
                            >
                              {project.archived_at ? (
                                <FiRotateCcw />
                              ) : (
                                <FiArchive />
                              )}
                            </IconButton>
                          </>
                        )}
                      </div>
                      <div className="mt-auto flex min-w-0 items-center gap-3 border-t border-black/10 pt-3 dark:border-white/10">
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
                              title={owners
                                .map((owner) => owner.full_name)
                                .join(", ")}
                            >
                              {owners
                                .map((owner) => owner.full_name)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                        {embedded && (
                          <Button.Link
                            href={withAccessPreview(
                              `/board?project=${encodeURIComponent(project.id)}`,
                              data.accessPreview,
                            )}
                            variant="secondary"
                            size="sm"
                            rightIcon={<FiArrowRight aria-hidden />}
                          >
                            Open board
                          </Button.Link>
                        )}
                      </div>
                    </div>
                  );
                })}
                {projects.length === 0 && (
                  <div
                    className={`rounded-xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-black/55 dark:border-white/10 dark:text-white/55 md:col-span-2 ${embedded ? "xl:col-span-3" : ""}`}
                  >
                    No projects match this search and filter.
                  </div>
                )}
              </div>
            </div>
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
            JSON.stringify(editingLinks) !==
              JSON.stringify(project.links ?? []) ||
            savedOwnerIds.length !== editingOwnerIds.length ||
            savedOwnerIds.some(
              (ownerId) => !editingOwnerIds.includes(ownerId),
            );
          return (
            <Modal
              open
              setIsOpen={(nextOpen) => {
                if (!nextOpen) closeEditor();
              }}
              title={`Edit ${project.name}`}
              size="lg"
              hideActions
              maxHeight="min(42rem, calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom))))"
              footer={
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={renaming}
                    onClick={closeEditor}
                  >
                    Cancel
                  </Button>
                  <Tooltip
                    content="Make a change before saving."
                    disabled={projectChanged}
                  >
                    <span tabIndex={projectChanged ? -1 : 0}>
                      <Button
                        type="submit"
                        form={`edit-project-form-${project.id}`}
                        disabled={!projectChanged}
                        loading={renaming}
                        loadingText="Saving..."
                      >
                        Save changes
                      </Button>
                    </span>
                  </Tooltip>
                </div>
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
                <Input
                  id={`edit-project-${project.id}`}
                  label="Project name"
                  name={`edit-project-${project.id}`}
                  required
                  autoFocus
                  value={editingName}
                  disabled={renaming}
                  onChange={(event) => setEditingName(event.target.value)}
                />
                <Textarea
                  id={`edit-project-description-${project.id}`}
                  label="Description"
                  name={`edit-project-description-${project.id}`}
                  value={editingDescription}
                  disabled={renaming}
                  onChange={(event) =>
                    setEditingDescription(event.target.value)
                  }
                  placeholder="What is this project working toward?"
                  rows={3}
                  required
                />
                <ProjectLinksFields
                  links={editingLinks}
                  setLinks={setEditingLinks}
                  disabled={renaming}
                />
                <ProjectAttachments
                  projectId={project.id}
                  demoMode={demoMode}
                  disabled={renaming}
                  currentUserId={data.currentProfile.id}
                />
                <MultiSelect
                  label="Project owners"
                  options={ownerOptions}
                  value={editingOwnerIds}
                  onChange={setEditingOwnerIds}
                  placeholder="Select owners"
                  disabled={renaming}
                  required
                />
              </form>
            </Modal>
          );
        })()}
    </>
  );
}

function ProjectLinksFields({
  links,
  setLinks,
  disabled,
}: {
  links: ProjectLink[];
  setLinks: Dispatch<SetStateAction<ProjectLink[]>>;
  disabled: boolean;
}) {
  function update(index: number, field: keyof ProjectLink, value: string) {
    setLinks((current) =>
      current.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [field]: value } : link,
      ),
    );
  }

  return (
    <DisclosureCard
      defaultOpen
      collapsible={links.length > 0}
      className="rounded-xl border border-black/10 bg-black/[0.015] p-3 dark:border-white/10 dark:bg-white/[0.025]"
      buttonClassName="flex w-fit items-center gap-2 text-left"
      panelClassName="pt-3"
      iconClassName="h-3.5 w-3.5"
      description={
        <p className="pr-2 text-xs leading-relaxed text-black/55 dark:text-white/55">
          Attach docs, designs, folders, or any other helpful web page.
        </p>
      }
      actions={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<FiPlus aria-hidden />}
          className="shrink-0 px-3 py-1.5 normal-case tracking-normal"
          disabled={disabled || links.length >= 10}
          onClick={() =>
            setLinks((current) => [...current, { label: "", url: "" }])
          }
        >
          Add link
        </Button>
      }
      summary={
        <span className="flex items-center gap-2 text-sm font-semibold">
          Useful links
          {links.length > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/10 px-1.5 text-[10px] font-semibold leading-none tabular-nums text-black/55 dark:bg-white/10 dark:text-white/55">
              {links.length}
            </span>
          )}
        </span>
      }
    >
      <div className={links.length > 0 ? "space-y-2" : undefined}>
        {links.map((link, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-lg border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-black/10 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto] sm:items-end"
          >
            <Input
              label="Label"
              name={`project-link-label-${index}`}
              value={link.label}
              placeholder="Design file"
              maxLength={80}
              required
              disabled={disabled}
              onChange={(event) => update(index, "label", event.target.value)}
            />
            <Input
              label="URL"
              name={`project-link-url-${index}`}
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              value={link.url}
              placeholder="ryanmeetup.com"
              required
              disabled={disabled}
              onChange={(event) => update(index, "url", event.target.value)}
              onBlur={(event) =>
                update(
                  index,
                  "url",
                  normalizeProjectLinkUrl(event.target.value),
                )
              }
            />
            <IconButton
              type="button"
              label={`Remove ${link.label || "link"}`}
              disabled={disabled}
              onClick={() =>
                setLinks((current) =>
                  current.filter((_, linkIndex) => linkIndex !== index),
                )
              }
            >
              <FiTrash2 />
            </IconButton>
          </div>
        ))}
      </div>
    </DisclosureCard>
  );
}
