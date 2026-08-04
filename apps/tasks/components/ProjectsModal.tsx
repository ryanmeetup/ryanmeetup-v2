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
  Textarea,
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
} from "react-icons/fi";
import { useSearchFilter } from "@ryanmeetup/hooks";
import { withAccessPreview } from "@/lib/access-preview";
import type { Project, ProjectLink, WorkspaceData } from "@/lib/types";
import { ProjectLinks } from "./ProjectLinks";

export function ProjectsModal({
  open,
  setOpen,
  data,
  setData,
  demoMode,
  embedded = false,
  createOnly = false,
  readOnly = false,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  demoMode: boolean;
  embedded?: boolean;
  createOnly?: boolean;
  readOnly?: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [creating, setCreating] = useState(false);
  const [projectStatus, setProjectStatus] = useState<
    "active" | "archived" | "all"
  >("active");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingLinks, setEditingLinks] = useState<ProjectLink[]>([]);
  const [renaming, setRenaming] = useState(false);
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
    if (!projectName) return;
    setCreating(true);
    try {
      let project: Project = {
        id: crypto.randomUUID(),
        name: projectName,
        description: description.trim() || null,
        links,
        created_by: data.currentProfile.id,
        archived_at: null,
        created_at: new Date().toISOString(),
      };
      if (!demoMode)
        project = (
          await request({ name: projectName, description, links }, "POST")
        ).project!;
      setData((current) => ({
        ...current,
        projects: [...current.projects, project],
      }));
      setName("");
      setDescription("");
      setLinks([]);
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
    setRenaming(true);
    try {
      if (!demoMode)
        await request(
          {
            id: project.id,
            name: nextName,
            description: nextDescription,
            links: editingLinks,
          },
          "PATCH",
        );
      setData((current) => ({
        ...current,
        projects: current.projects.map((item) =>
          item.id === project.id
            ? {
                ...item,
                name: nextName,
                description: nextDescription,
                links: editingLinks,
              }
            : item,
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
    setEditingProjectId(project.id);
    setEditingName(project.name);
    setEditingDescription(project.description ?? "");
    setEditingLinks(project.links ?? []);
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
              <div>
                <Input
                  label="New project"
                  name="project-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="RyanCon 2027"
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
              <ProjectLinksFields
                links={links}
                setLinks={setLinks}
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
            Give the work a clear home. Assign access groups from Access &
            permissions afterward.
          </p>
        ) : (
          <>
            <p className="mb-5 text-sm text-black/60 dark:text-white/60">
              Projects collect related work across categories. Access is managed
              through groups, and projects can be archived when the work is
              over.
            </p>
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
                              className="mt-2"
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
                      {embedded && (
                        <div className="mt-auto flex justify-end pt-3">
                          <Button.Link
                            href={withAccessPreview(
                              `/?project=${encodeURIComponent(project.name)}`,
                              data.accessPreview,
                            )}
                            variant="secondary"
                            size="sm"
                            rightIcon={<FiArrowRight aria-hidden />}
                          >
                            Open board
                          </Button.Link>
                        </div>
                      )}
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
          return (
            <Modal
              open
              setIsOpen={(nextOpen) => {
                if (!nextOpen && !renaming) setEditingProjectId(null);
              }}
              title={`Edit ${project.name}`}
              size="lg"
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
                <ProjectLinksFields
                  links={editingLinks}
                  setLinks={setEditingLinks}
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
    <fieldset
      className="rounded-xl border border-black/10 bg-black/[0.015] p-3 dark:border-white/10 dark:bg-white/[0.025]"
      aria-labelledby="project-links-label"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <span id="project-links-label" className="text-sm font-semibold">
            Useful links
          </span>
          {links.length === 0 && (
            <p className="mt-1 pr-2 text-xs leading-relaxed text-black/55 dark:text-white/55">
              Attach docs, designs, folders, or any other helpful web page.
            </p>
          )}
        </div>
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
      </div>
      <div className={links.length > 0 ? "mt-3 space-y-2" : undefined}>
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
              type="url"
              value={link.url}
              placeholder="https://…"
              required
              disabled={disabled}
              onChange={(event) => update(index, "url", event.target.value)}
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
    </fieldset>
  );
}
