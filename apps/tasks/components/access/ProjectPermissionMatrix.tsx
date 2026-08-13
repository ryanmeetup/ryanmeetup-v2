"use client";

import { useMemo } from "react";
import { useSearchFilter } from "@ryanmeetup/hooks";
import { Card, DropdownSelect, Input, toast } from "@ryanmeetup/ui";
import { FiCheckCircle, FiLoader, FiSearch, FiXCircle } from "react-icons/fi";
import { CountBadge } from "@/components/global";
import {
  isInheritedPermissionEffective,
  selectEffectivePermission,
  selectInheritedProjectAccess,
} from "@/lib/access-selectors";
import type {
  AccessGroup,
  AccessPermission,
  GroupGrant,
} from "@/lib/access-types";
import type { Project } from "@/lib/resource-types";

export function ProjectPermissionMatrix({
  group,
  groups,
  grants,
  projects,
  pendingProjectIds,
  onChange,
}: {
  group: AccessGroup;
  groups: AccessGroup[];
  grants: GroupGrant[];
  projects: Project[];
  pendingProjectIds: Set<string>;
  onChange: (
    projectId: string,
    permission: AccessPermission | "none",
  ) => Promise<unknown>;
}) {
  const directGrants = useMemo(
    () =>
      new Map(
        grants
          .filter((grant) => grant.group_id === group.id)
          .map((grant) => [grant.project_id, grant]),
      ),
    [grants, group.id],
  );
  const inheritedAccess = useMemo(
    () => selectInheritedProjectAccess(group, groups, grants),
    [group, groups, grants],
  );
  const { query, setQuery, filtered, isPending } = useSearchFilter({
    data: projects,
    buildHaystack: (project) =>
      `${project.name} ${project.description ?? ""}`.toLowerCase(),
    queryParam: "project-access-q",
  });

  async function update(
    project: Project,
    permission: AccessPermission | "none",
  ) {
    await onChange(project.id, permission);
    toast.success(
      permission === "none"
        ? `Direct access to ${project.name} removed.`
        : `${project.name} saved as ${permission}.`,
    );
  }

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden p-5 xl:h-[32rem] xl:max-h-[32rem] xl:min-h-[28rem]">
      <h2 className="flex items-center gap-2 font-semibold">
        Project visibility
        <CountBadge>
          {group.grants_global_content
            ? `${projects.length} global`
            : `${new Set([...directGrants.keys(), ...inheritedAccess.keys()]).size} of ${projects.length}`}
        </CountBadge>
      </h2>
      {group.grants_global_content && (
        <div className="mt-3 rounded-xl border border-black/10 bg-black/[0.035] px-3 py-2 text-xs text-black/65 dark:border-white/10 dark:bg-white/[0.035] dark:text-white/65">
          This tier already has manager access to every current and future
          project. Disable global content access above to use individual project
          permissions.
        </div>
      )}
      <div className="relative mt-4">
        <Input
          label="Search projects"
          name="project-access-search"
          leadingIcon={<FiSearch aria-hidden />}
          aria-busy={isPending}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects…"
          inputClassName="pr-10"
        />
        {isPending && (
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
        className={`-mb-5 mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-5 pr-1 transition-opacity [scrollbar-gutter:stable] ${isPending ? "pointer-events-none opacity-55" : ""}`}
        aria-busy={isPending}
      >
        {filtered.length > 0 ? (
          <ul className="space-y-2">
            {filtered.map((project) => {
              const direct = directGrants.get(project.id);
              const inherited = inheritedAccess.get(project.id);
              const effective = selectEffectivePermission(direct, inherited);
              const inheritedIsEffective = isInheritedPermissionEffective(
                direct,
                inherited,
              );
              const saving = pendingProjectIds.has(project.id);
              return (
                <li
                  key={project.id}
                  className="rounded-xl border border-black/5 bg-black/[0.035] p-3 dark:border-white/5 dark:bg-white/[0.035]"
                >
                  <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-end">
                    <div className="min-w-0 self-center">
                      <p className="truncate text-sm font-medium">
                        {project.name}
                      </p>
                      <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs">
                        {group.grants_global_content ? (
                          <span className="flex min-w-0 items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                            <FiCheckCircle aria-hidden className="shrink-0" />
                            <span>Manager access across all projects</span>
                          </span>
                        ) : effective ? (
                          <span className="flex min-w-0 items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                            <FiCheckCircle aria-hidden className="shrink-0" />
                            <span className="truncate">
                              {effective[0].toUpperCase() + effective.slice(1)}{" "}
                              access
                              {inheritedIsEffective
                                ? ` via ${inherited?.sources.join(", ")}`
                                : direct
                                  ? " · Direct"
                                  : ""}
                            </span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
                            <FiXCircle aria-hidden className="shrink-0" />
                            <span>No access</span>
                          </span>
                        )}
                        {saving && (
                          <FiLoader
                            aria-label={`Saving ${project.name} access`}
                            className="animate-spin motion-reduce:animate-none"
                          />
                        )}
                      </div>
                    </div>
                    <DropdownSelect
                      label="Direct access"
                      variant="field"
                      value={direct?.permission ?? "none"}
                      onChange={(value) =>
                        void update(project, value as AccessPermission | "none")
                      }
                      options={[
                        { label: "No direct access", value: "none" },
                        { label: "Viewer", value: "viewer" },
                        { label: "Editor", value: "editor" },
                        { label: "Manager", value: "manager" },
                      ]}
                      disabled={group.grants_global_content || saving}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-black/15 px-4 py-8 text-center text-sm text-black/60 dark:border-white/15 dark:text-white/60">
            No projects match “{query}”.
          </div>
        )}
      </div>
    </Card>
  );
}
