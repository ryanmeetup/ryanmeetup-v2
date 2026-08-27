"use client";

import { useMemo, useState } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import {
  Button,
  Card,
  DropdownSelect,
  MultiSelect,
  toast,
} from "@ryanmeetup/ui";
import { FiChevronDown, FiFolder, FiTag } from "react-icons/fi";
import { mutate } from "@/lib/mutation-client";
import { errorMessage } from "@/lib/presentation";
import type { AccessGroup, GroupGrant } from "@/lib/access/access-types";
import type { Category, Project } from "@/lib/resources/resource-types";
import {
  categoryVisibilityMode,
  categoryVisibilityPayload,
  eligibleVisibilityGroups,
  isVisibilityIncomplete,
  projectVisibilityPayload,
  visibilityOptions,
  visibilitySummary,
  type VisibilityKind,
  type VisibilityMode,
} from "@/lib/access/content-visibility";

type CategoryGrant = { category_id: string; group_id: string };

function VisibilityRow({
  kind,
  name,
  initialMode,
  initialGroupIds,
  groups,
  onSave,
}: {
  kind: VisibilityKind;
  name: string;
  initialMode: VisibilityMode;
  initialGroupIds: string[];
  groups: AccessGroup[];
  onSave: (mode: VisibilityMode, groupIds: string[]) => Promise<void>;
}) {
  const [mode, setMode] = useState(initialMode);
  const [groupIds, setGroupIds] = useState(initialGroupIds);
  const [saving, setSaving] = useState(false);
  const groupNames = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name])),
    [groups],
  );
  const invalid = isVisibilityIncomplete(mode, groupIds);

  return (
    <li className="flex flex-col items-stretch gap-3 border-t border-black/10 py-3 first:border-t-0 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
        {kind === "project" ? (
          <FiFolder
            aria-hidden
            className="shrink-0 text-black/45 dark:text-white/45"
          />
        ) : (
          <FiTag
            aria-hidden
            className="shrink-0 text-black/45 dark:text-white/45"
          />
        )}
        <span className="truncate">{name}</span>
      </span>
      <Popover className="relative w-full shrink-0 sm:w-auto">
        <PopoverButton className="flex w-full items-center justify-between gap-2 rounded-lg border border-black/10 bg-black/[0.035] px-3 py-2 text-left text-sm transition-colors hover:bg-black/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/50 dark:border-white/10 dark:bg-white/[0.035] dark:hover:bg-white/[0.08] dark:focus-visible:ring-white/60 sm:max-w-[16rem]">
          <span className="truncate">
            {visibilitySummary(mode, groupIds, groupNames)}
          </span>
          <FiChevronDown aria-hidden className="shrink-0" />
        </PopoverButton>
        <PopoverPanel
          anchor="bottom end"
          className="z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-black/10 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-neutral-900"
        >
          {({ close }) => (
            <div className="space-y-4">
              <DropdownSelect
                label="Who can access this?"
                variant="field"
                value={mode}
                onChange={(value) => setMode(value as VisibilityMode)}
                options={visibilityOptions(kind)}
                disabled={saving}
                required
              />
              {mode === "restricted" && (
                <MultiSelect
                  label="Access groups"
                  options={groups.map((group) => ({
                    label: group.name,
                    value: group.id,
                  }))}
                  value={groupIds}
                  onChange={setGroupIds}
                  placeholder="Choose access groups"
                  searchable
                  searchPlaceholder="Search access groups"
                  disabled={saving}
                />
              )}
              <p className="text-xs text-black/65 dark:text-white/65">
                Tasks remain visible only when someone can access both their
                project and every assigned category.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => close()}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  loading={saving}
                  loadingText="Saving..."
                  disabled={invalid}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await onSave(mode, groupIds);
                      toast.success(`${name} visibility updated.`);
                      close();
                    } catch (error) {
                      toast.error(
                        errorMessage(
                          error,
                          `${name} visibility could not be updated.`,
                        ),
                      );
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </PopoverPanel>
      </Popover>
    </li>
  );
}

export function ContentVisibilityPanel({
  projects,
  categories,
  groups,
  projectGrants,
  categoryGrants,
}: {
  projects: Project[];
  categories: Category[];
  groups: AccessGroup[];
  projectGrants: GroupGrant[];
  categoryGrants: CategoryGrant[];
}) {
  const eligibleGroups = eligibleVisibilityGroups(groups);
  const projectGroupIds = (projectId: string) =>
    projectGrants
      .filter((grant) => grant.project_id === projectId)
      .map((grant) => grant.group_id);
  const categoryGroupIds = (categoryId: string) =>
    categoryGrants
      .filter((grant) => grant.category_id === categoryId)
      .map((grant) => grant.group_id);

  return (
    <section aria-labelledby="content-visibility-heading">
      <Card className="p-5">
        <h2 id="content-visibility-heading" className="font-semibold">
          Content visibility
        </h2>
        <p className="mt-1 text-sm text-black/70 dark:text-white/70">
          Choose who can access each project and category without configuring
          every group separately.
        </p>
        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60 dark:text-white/60">
              Projects
            </h3>
            <ul className="mt-2">
              {projects.length === 0 && (
                <li className="py-3 text-sm text-black/60 dark:text-white/60">
                  No projects yet.
                </li>
              )}
              {projects.map((project) => (
                <VisibilityRow
                  key={project.id}
                  kind="project"
                  name={project.name}
                  initialMode={project.access_mode}
                  initialGroupIds={projectGroupIds(project.id)}
                  groups={eligibleGroups}
                  onSave={(mode, groupIds) =>
                    mutate("/api/project-access", {
                      method: "POST",
                      body: JSON.stringify(
                        projectVisibilityPayload(project.id, mode, groupIds),
                      ),
                    }).then(() => undefined)
                  }
                />
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60 dark:text-white/60">
              Categories
            </h3>
            <ul className="mt-2">
              {categories.length === 0 && (
                <li className="py-3 text-sm text-black/60 dark:text-white/60">
                  No categories yet.
                </li>
              )}
              {categories.map((category) => {
                const groupIds = categoryGroupIds(category.id);
                const mode = categoryVisibilityMode(
                  category.access_mode,
                  groupIds,
                );
                return (
                  <VisibilityRow
                    key={category.id}
                    kind="category"
                    name={category.name}
                    initialMode={mode}
                    initialGroupIds={groupIds}
                    groups={eligibleGroups}
                    onSave={(nextMode, nextGroupIds) =>
                      mutate("/api/category-access", {
                        method: "POST",
                        body: JSON.stringify(
                          categoryVisibilityPayload(
                            category.id,
                            nextMode,
                            nextGroupIds,
                          ),
                        ),
                      }).then(() => undefined)
                    }
                  />
                );
              })}
            </ul>
          </div>
        </div>
      </Card>
    </section>
  );
}
