"use client";

import {
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  Avatar,
  Button,
  FilterChip,
  IconButton,
  Input,
  Modal,
  MultiSelect,
  Textarea,
  toast,
} from "@ryanmeetup/ui";
import {
  FiArchive,
  FiEdit2,
  FiRotateCcw,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import { useSearchFilter } from "@ryanmeetup/hooks";
import type { Project, WorkspaceData } from "@/lib/types";

export function ProjectsModal({
  open,
  setOpen,
  data,
  setData,
  demoMode,
  embedded = false,
  createOnly = false,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  demoMode: boolean;
  embedded?: boolean;
  createOnly?: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [projectStatus, setProjectStatus] = useState<
    "active" | "archived" | "all"
  >("active");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingOwnerIds, setEditingOwnerIds] = useState<string[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [newOwnerIds, setNewOwnerIds] = useState<string[]>([
    data.currentProfile.id,
  ]);
  const {
    query: projectQuery,
    setQuery: setProjectQuery,
    filtered: searchedProjects,
  } = useSearchFilter({
    data: data.projects,
    buildHaystack: (project) =>
      `${project.name} ${project.description ?? ""}`.toLowerCase(),
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
    if (!projectName) return;
    const ownerIds = [...new Set(newOwnerIds)];
    setCreating(true);
    try {
      let project: Project = {
        id: crypto.randomUUID(),
        name: projectName,
        description: description.trim() || null,
        created_by: data.currentProfile.id,
        archived_at: null,
        created_at: new Date().toISOString(),
      };
      if (!demoMode)
        project = (
          await request({ name: projectName, description, ownerIds }, "POST")
        ).project!;
      setData((current) => ({
        ...current,
        projects: [...current.projects, project],
        projectOwners: [
          ...current.projectOwners,
          ...ownerIds.map((profile_id) => ({
            project_id: project.id,
            profile_id,
          })),
        ],
      }));
      setName("");
      setDescription("");
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
    const nextDescription = editingDescription.trim() || null;
    const ownerIds = [...new Set(editingOwnerIds)];
    setRenaming(true);
    try {
      if (!demoMode)
        await request(
          {
            id: project.id,
            name: nextName,
            description: nextDescription,
            ownerIds,
          },
          "PATCH",
        );
      setData((current) => ({
        ...current,
        projects: current.projects.map((item) =>
          item.id === project.id
            ? { ...item, name: nextName, description: nextDescription }
            : item,
        ),
        projectOwners: [
          ...current.projectOwners.filter(
            (item) => item.project_id !== project.id,
          ),
          ...ownerIds.map((profile_id) => ({
            project_id: project.id,
            profile_id,
          })),
        ],
      }));
      toast.success(`${nextName} updated.`);
      setEditingProjectId(null);
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
    setEditingOwnerIds(
      data.projectOwners
        .filter((item) => item.project_id === project.id)
        .map((item) => item.profile_id),
    );
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
        avatar: {
          name: profile.full_name,
          src: profile.avatar_url,
        },
        label: profile.full_name,
        value: profile.id,
      })),
    [data.profiles],
  );

  return (
    <>
      <Modal
        open={open}
        setIsOpen={setOpen}
        title={embedded ? null : createOnly ? "New project" : "Projects"}
        hideActions
        size={createOnly ? "md" : "xl"}
        embedded={embedded}
        maxHeight="min(42rem, calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom))))"
        footer={
          embedded ? undefined : (
            <form
              id="create-project-form"
              className="grid gap-4"
              onSubmit={addProject}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  label="New project"
                  name="project-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="RyanCon 2027"
                  disabled={creating}
                />
                <MultiSelect
                  label="Initial owners"
                  options={ownerOptions}
                  value={newOwnerIds}
                  onChange={setNewOwnerIds}
                  placeholder="Select owners"
                  disabled={creating}
                />
              </div>
              <Textarea
                id="project-description"
                label="Description"
                name="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this project working toward?"
                rows={2}
                disabled={creating}
              />
              <div className="flex justify-end gap-2 border-t border-black/10 pt-4 dark:border-white/10">
                {embedded ? (
                  <Button.Link href="/" variant="secondary">
                    Back to tasks
                  </Button.Link>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setOpen(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="action"
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
          <p className="text-sm text-black/60 dark:text-white/60">
            Give the work a clear home. You can manage owners, descriptions, and
            archive settings from the Projects page afterward.
          </p>
        ) : (
          <>
            <p className="mb-5 text-sm text-black/60 dark:text-white/60">
              Projects collect related work across categories. Assign one or
              more owners to drive the work, then archive it when it is over.
            </p>
            <div className="sticky top-0 z-20 -mx-1 mb-4 grid gap-3 bg-white px-1 pb-3 dark:bg-[#181818] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Input
                label="Search projects"
                name="project-search"
                hideLabel
                leadingIcon={<FiSearch aria-hidden />}
                value={projectQuery}
                onChange={(event) => setProjectQuery(event.target.value)}
                placeholder="Search projects..."
              />
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
            <div
              className={`grid auto-rows-fr items-stretch gap-4 md:grid-cols-2 ${embedded ? "xl:grid-cols-3" : ""}`}
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
                const ownerSummary =
                  owners.length === 0
                    ? "Unassigned"
                    : owners.length <= 2
                      ? owners.map((owner) => owner.full_name).join(", ")
                      : `${owners
                          .slice(0, 2)
                          .map((owner) => owner.full_name)
                          .join(", ")} +${owners.length - 2}`;

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
                      </div>
                      {project.archived_at && (
                        <span className="mt-2 hidden text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45 sm:inline">
                          Archived
                        </span>
                      )}
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
                        {project.archived_at ? <FiRotateCcw /> : <FiArchive />}
                      </IconButton>
                    </div>

                    <div className="mt-auto flex min-w-0 items-center gap-3 border-t border-black/10 pt-3 dark:border-white/10">
                      {owners.length > 0 ? (
                        <div
                          className="flex shrink-0 -space-x-2"
                          aria-label={`${owners.length} ${owners.length === 1 ? "owner" : "owners"}`}
                        >
                          {owners.slice(0, 3).map((owner) => (
                            <Avatar
                              key={owner.id}
                              name={owner.full_name}
                              src={owner.avatar_url}
                              size="md"
                              className="ring-2 ring-white dark:ring-[#181818]"
                            />
                          ))}
                          {owners.length > 3 && (
                            <span className="relative inline-grid h-8 w-8 shrink-0 place-items-center rounded-full border border-black/10 bg-zinc-100 text-[9px] font-bold text-black/65 ring-2 ring-white dark:border-white/15 dark:bg-zinc-800 dark:text-white/70 dark:ring-[#181818]">
                              +{owners.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-dashed border-black/25 text-black/40 dark:border-white/25 dark:text-white/40">
                          <FiUsers aria-hidden size={14} />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
                          Owners
                        </p>
                        <p className="truncate text-xs font-medium text-black/65 dark:text-white/65">
                          {ownerSummary}
                        </p>
                      </div>
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
          </>
        )}
      </Modal>
      {editingProjectId &&
        (() => {
          const project = data.projects.find(
            (item) => item.id === editingProjectId,
          );
          if (!project) return null;
          return (
            <Modal
              open
              setIsOpen={(nextOpen) => {
                if (!nextOpen && !renaming) setEditingProjectId(null);
              }}
              title={`Edit ${project.name}`}
              size="md"
              hideActions
            >
              <form
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
                />
                <MultiSelect
                  label="Owners"
                  options={ownerOptions}
                  value={editingOwnerIds}
                  onChange={setEditingOwnerIds}
                  placeholder="Select owners"
                  disabled={renaming}
                />
                <div className="flex justify-end gap-2 border-t border-black/10 pt-4 dark:border-white/10">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={renaming}
                    onClick={() => setEditingProjectId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={renaming}
                    loadingText="Saving..."
                  >
                    Save changes
                  </Button>
                </div>
              </form>
            </Modal>
          );
        })()}
    </>
  );
}
