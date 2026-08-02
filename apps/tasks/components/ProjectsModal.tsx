"use client";

import {
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  Button,
  IconButton,
  Input,
  Modal,
  Spinner,
  toast,
} from "@ryanmeetup/ui";
import { FiArchive, FiEdit2, FiPlus, FiRotateCcw } from "react-icons/fi";
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
        project = (
          await request({ name: projectName, ownerIds: newOwnerIds }, "POST")
        ).project!;
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

  async function rename(project: Project) {
    const nextName = window
      .prompt("Update the project name", project.name)
      ?.trim();
    if (!nextName || nextName === project.name) return;
    try {
      if (!demoMode) await request({ id: project.id, name: nextName }, "PATCH");
      setData((current) => ({
        ...current,
        projects: current.projects.map((item) =>
          item.id === project.id ? { ...item, name: nextName } : item,
        ),
      }));
      toast.success(`${nextName} updated.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The project could not be renamed.",
      );
    }
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

  async function toggleOwner(project: Project, profileId: string) {
    const currentOwnerIds = data.projectOwners
      .filter((item) => item.project_id === project.id)
      .map((item) => item.profile_id);
    const ownerIds = currentOwnerIds.includes(profileId)
      ? currentOwnerIds.filter((id) => id !== profileId)
      : [...currentOwnerIds, profileId];
    try {
      if (!demoMode) await request({ id: project.id, ownerIds }, "PATCH");
      setData((current) => ({
        ...current,
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
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The project owners could not be updated.",
      );
    }
  }

  const projects = [...data.projects].sort(
    (a, b) =>
      Number(Boolean(a.archived_at)) - Number(Boolean(b.archived_at)) ||
      a.name.localeCompare(b.name),
  );

  return (
    <Modal
      open={open}
      setIsOpen={setOpen}
      title="Projects"
      hideActions
      size="xl"
    >
      <p className="mb-5 text-sm text-black/60 dark:text-white/60">
        Projects collect related work across categories. Assign one or more
        owners to drive the work, then archive it when it is over.
      </p>
      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="rounded-xl border border-black/10 p-3 dark:border-white/10"
          >
            <div className="flex items-center gap-3">
              <span
                className={`min-w-0 flex-1 truncate font-semibold ${project.archived_at ? "text-black/45 line-through dark:text-white/45" : ""}`}
              >
                {project.name}
              </span>
              {project.archived_at && (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45">
                  Archived
                </span>
              )}
              <IconButton
                label={`Rename ${project.name}`}
                onClick={() => void rename(project)}
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
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45">
                Owners
              </span>
              {data.profiles.map((profile) => {
                const selected = data.projectOwners.some(
                  (item) =>
                    item.project_id === project.id &&
                    item.profile_id === profile.id,
                );
                return (
                  <label
                    key={profile.id}
                    className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold ${selected ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 dark:border-white/10"}`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selected}
                      onChange={() => void toggleOwner(project, profile.id)}
                    />
                    {profile.full_name}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <form
        className="mt-5 grid gap-3 border-t border-black/10 pt-5 dark:border-white/10 sm:grid-cols-[1fr_auto]"
        onSubmit={addProject}
      >
        <Input
          label="New project"
          name="project-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="RyanCon 2027"
        />
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
            Initial owners
          </legend>
          <div className="flex flex-wrap gap-2">
            {data.profiles.map((profile) => {
              const selected = newOwnerIds.includes(profile.id);
              return (
                <label
                  key={profile.id}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold ${selected ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/10 dark:border-white/10"}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selected}
                    onChange={() =>
                      setNewOwnerIds(
                        selected
                          ? newOwnerIds.filter((id) => id !== profile.id)
                          : [...newOwnerIds, profile.id],
                      )
                    }
                  />
                  {profile.full_name}
                </label>
              );
            })}
          </div>
        </fieldset>
        <Button
          type="submit"
          variant="action"
          className="sm:col-start-2 sm:row-start-1"
          leftIcon={creating ? <Spinner className="h-4 w-4" /> : <FiPlus />}
          disabled={creating}
        >
          {creating ? "Creating" : "Create project"}
        </Button>
      </form>
    </Modal>
  );
}
