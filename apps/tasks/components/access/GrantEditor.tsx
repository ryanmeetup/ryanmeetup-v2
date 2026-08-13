"use client";

import { useState } from "react";
import { Button, DropdownSelect } from "@ryanmeetup/ui";
import type { Project } from "@/lib/types";
import type { AccessPermission } from "@/lib/access-types";

export type Permission = AccessPermission;

export function GrantEditor({
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
