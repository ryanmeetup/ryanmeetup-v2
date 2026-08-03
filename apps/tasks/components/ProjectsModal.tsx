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
  FilterChip,
  IconButton,
  Input,
  Modal,
  MultiSelect,
  toast,
} from "@ryanmeetup/ui";
import {
  FiArchive,
  FiChevronDown,
  FiEdit2,
  FiRotateCcw,
  FiSearch,
} from "react-icons/fi";
import type { Project, WorkspaceData } from "@/lib/types";

export function ProjectsModal({
  open,
  setOpen,
  data,
  setData,
  demoMode,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  demoMode: boolean;
}) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [projectQuery, setProjectQuery] = useState("");
  const [projectStatus, setProjectStatus] = useState<
    "active" | "archived" | "all"
  >("active");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    null,
  );
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [savingOwnersProjectId, setSavingOwnersProjectId] = useState<
    string | null
  >(null);
  const [newOwnerIds, setNewOwnerIds] = useState<string[]>([
    data.currentProfile.id,
  ]);

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
        created_by: data.currentProfile.id,
        archived_at: null,
        created_at: new Date().toISOString(),
      };
      if (!demoMode)
        project = (await request({ name: projectName, ownerIds }, "POST"))
          .project!;
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
      toast.success(`${project.name} created.`);
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

  async function rename(project: Project, nextName: string) {
    if (!nextName) return;
    if (nextName === project.name) {
      setEditingProjectId(null);
      return;
    }
    setRenaming(true);
    try {
      if (!demoMode) await request({ id: project.id, name: nextName }, "PATCH");
      setData((current) => ({
        ...current,
        projects: current.projects.map((item) =>
          item.id === project.id ? { ...item, name: nextName } : item,
        ),
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
    setExpandedProjectId(project.id);
    setEditingProjectId(project.id);
    setEditingName(project.name);
    window.requestAnimationFrame(() => {
      document.getElementById(`edit-project-${project.id}`)?.focus();
    });
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

  async function updateOwners(project: Project, ownerIds: string[]) {
    if (savingOwnersProjectId === project.id) return;
    const normalizedOwnerIds = [...new Set(ownerIds)];
    setSavingOwnersProjectId(project.id);
    try {
      if (!demoMode)
        await request(
          { id: project.id, ownerIds: normalizedOwnerIds },
          "PATCH",
        );
      setData((current) => ({
        ...current,
        projectOwners: [
          ...current.projectOwners.filter(
            (item) => item.project_id !== project.id,
          ),
          ...normalizedOwnerIds.map((profile_id) => ({
            project_id: project.id,
            profile_id,
          })),
        ],
      }));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The project owners could not be updated.",
      );
    } finally {
      setSavingOwnersProjectId(null);
    }
  }

  const projects = useMemo(
    () =>
      [...data.projects]
        .filter((project) => {
          const matchesStatus =
            projectStatus === "all" ||
            (projectStatus === "archived"
              ? Boolean(project.archived_at)
              : !project.archived_at);
          return (
            matchesStatus &&
            project.name
              .toLowerCase()
              .includes(projectQuery.trim().toLowerCase())
          );
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.projects, projectQuery, projectStatus],
  );
  const ownerOptions = useMemo(
    () =>
      data.profiles.map((profile) => ({
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
        title="Projects"
        hideActions
        size="xl"
        maxHeight="min(42rem, calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom))))"
        footer={
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
            <div className="flex justify-end gap-2 border-t border-black/10 pt-4 dark:border-white/10">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
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
        }
      >
        <p className="mb-5 text-sm text-black/60 dark:text-white/60">
          Projects collect related work across categories. Assign one or more
          owners to drive the work, then archive it when it is over.
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
          <div className="flex flex-wrap gap-2" aria-label="Filter projects">
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
        <div className="grid items-start gap-2 md:grid-cols-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/10"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30"
                  aria-expanded={expandedProjectId === project.id}
                  aria-controls={`project-settings-${project.id}`}
                  onClick={() => {
                    setEditingProjectId(null);
                    setExpandedProjectId((current) =>
                      current === project.id ? null : project.id,
                    );
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate font-semibold ${project.archived_at ? "text-black/45 line-through dark:text-white/45" : ""}`}
                    >
                      {project.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-black/50 dark:text-white/50">
                      {(() => {
                        const owners = data.projectOwners
                          .filter((item) => item.project_id === project.id)
                          .map((item) =>
                            data.profiles.find(
                              (profile) => profile.id === item.profile_id,
                            ),
                          )
                          .filter(Boolean)
                          .map((profile) => profile!.full_name);
                        if (owners.length === 0) return "No owners";
                        if (owners.length <= 2) return owners.join(", ");
                        return `${owners.slice(0, 2).join(", ")} +${owners.length - 2}`;
                      })()}
                    </span>
                  </span>
                  {project.archived_at && (
                    <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45 sm:inline">
                      Archived
                    </span>
                  )}
                  <FiChevronDown
                    aria-hidden
                    className={`shrink-0 transition-transform ${expandedProjectId === project.id ? "rotate-180" : ""}`}
                  />
                </button>
                <IconButton
                  label={`Rename ${project.name}`}
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
              <div
                id={`project-settings-${project.id}`}
                aria-hidden={expandedProjectId !== project.id}
                inert={expandedProjectId !== project.id ? true : undefined}
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                  expandedProjectId === project.id
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="mt-2 border-t border-black/10 pt-3 dark:border-white/10">
                    {editingProjectId === project.id && (
                      <form
                        className="mb-4 space-y-3"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void rename(project, editingName.trim());
                        }}
                      >
                        <Input
                          id={`edit-project-${project.id}`}
                          label={`Name for ${project.name}`}
                          name={`edit-project-${project.id}`}
                          hideLabel
                          required
                          value={editingName}
                          disabled={renaming}
                          onChange={(event) =>
                            setEditingName(event.target.value)
                          }
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={renaming}
                            onClick={() => setEditingProjectId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            loading={renaming}
                            loadingText="Saving..."
                          >
                            Save
                          </Button>
                        </div>
                      </form>
                    )}
                    <MultiSelect
                      label="Owners"
                      options={ownerOptions}
                      value={data.projectOwners
                        .filter((item) => item.project_id === project.id)
                        .map((item) => item.profile_id)}
                      onChange={(ownerIds) =>
                        void updateOwners(project, ownerIds)
                      }
                      placeholder="Select owners"
                      disabled={savingOwnersProjectId === project.id}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="rounded-xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-black/55 dark:border-white/10 dark:text-white/55 md:col-span-2">
              No projects match this search and filter.
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
