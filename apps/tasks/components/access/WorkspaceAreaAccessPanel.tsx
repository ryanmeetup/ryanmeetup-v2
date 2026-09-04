"use client";

import { useState } from "react";
import {
  Button,
  Card,
  DropdownSelect,
  MultiSelect,
  toast,
} from "@ryanmeetup/ui";
import { FiLock, FiUnlock } from "react-icons/fi";
import {
  WORKSPACE_AREAS,
  type WorkspaceAreaKey,
} from "@/lib/access/workspace-areas";
import type { AccessGroup } from "@/lib/access/access-types";
import { mutate } from "@/lib/mutation-client";
import { errorMessage } from "@/lib/presentation";

export type WorkspaceAreaAccess = {
  area: WorkspaceAreaKey;
  accessMode: "open" | "restricted";
  groupIds: string[];
};

/**
 * Who can open Notes, Contacts, and the Calendar.
 *
 * One card per page rather than a checkbox per group, so "who can see
 * Contacts?" is answered by reading one row instead of opening every group.
 * Each card saves on its own: locking a page is a deliberate act and must not
 * ride along with an unrelated edit elsewhere on the screen.
 */
export function WorkspaceAreaAccessPanel({
  groups,
  initialAccess,
  enforced,
}: {
  groups: AccessGroup[];
  initialAccess: WorkspaceAreaAccess[];
  /** False until the migration that creates the page-access tables is applied. */
  enforced: boolean;
}) {
  const [access, setAccess] = useState<WorkspaceAreaAccess[]>(() =>
    WORKSPACE_AREAS.map(
      (area) =>
        initialAccess.find((entry) => entry.area === area.key) ?? {
          area: area.key,
          accessMode: "open" as const,
          groupIds: [],
        },
    ),
  );
  const [savingArea, setSavingArea] = useState<WorkspaceAreaKey | null>(null);

  const entryFor = (key: WorkspaceAreaKey) =>
    access.find((entry) => entry.area === key)!;
  const update = (key: WorkspaceAreaKey, patch: Partial<WorkspaceAreaAccess>) =>
    setAccess((current) =>
      current.map((entry) =>
        entry.area === key ? { ...entry, ...patch } : entry,
      ),
    );

  async function save(key: WorkspaceAreaKey) {
    const entry = entryFor(key);
    const label =
      WORKSPACE_AREAS.find((area) => area.key === key)?.label ?? key;
    setSavingArea(key);
    try {
      await mutate("/api/workspace-area-access", {
        method: "POST",
        body: JSON.stringify({
          area: entry.area,
          accessMode: entry.accessMode,
          groupIds: entry.accessMode === "restricted" ? entry.groupIds : [],
        }),
      });
      toast.success(`${label} access saved.`);
    } catch (error) {
      toast.error(errorMessage(error, `${label} access could not be saved.`));
    } finally {
      setSavingArea(null);
    }
  }

  return (
    <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
      {WORKSPACE_AREAS.map((area) => {
        const entry = entryFor(area.key);
        const restricted = entry.accessMode === "restricted";
        const Icon = area.icon;
        return (
          <Card key={area.key} className="flex h-full flex-col gap-4 p-5">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold leading-tight">
                <Icon aria-hidden className="shrink-0" />
                {area.label}
                <span
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-black/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black/55 dark:border-white/10 dark:text-white/55"
                  aria-label={
                    restricted
                      ? `${area.label} is restricted`
                      : `${area.label} is open to everyone`
                  }
                >
                  {restricted ? (
                    <FiLock aria-hidden />
                  ) : (
                    <FiUnlock aria-hidden />
                  )}
                  {restricted ? "Restricted" : "Open"}
                </span>
              </h3>
              <p className="mt-1 text-sm text-black/65 dark:text-white/65">
                {area.description}
              </p>
            </div>
            <DropdownSelect
              variant="field"
              label={`Who can open ${area.label}?`}
              value={entry.accessMode}
              onChange={(value) =>
                update(area.key, {
                  accessMode: value as WorkspaceAreaAccess["accessMode"],
                })
              }
              options={[
                { label: "Everyone in the workspace", value: "open" },
                { label: "Selected access groups", value: "restricted" },
              ]}
              disabled={!enforced || savingArea === area.key}
              required
            />
            {restricted && (
              <>
                <MultiSelect
                  label="Access groups"
                  options={groups.map((group) => ({
                    label: group.grants_global_content
                      ? `${group.name} (manager tier)`
                      : group.name,
                    value: group.id,
                  }))}
                  value={entry.groupIds}
                  onChange={(groupIds) => update(area.key, { groupIds })}
                  placeholder="Choose access groups"
                  searchable
                  searchPlaceholder="Search access groups"
                  disabled={!enforced || savingArea === area.key}
                />
                {entry.groupIds.length === 0 && (
                  <p className="text-sm text-black/65 dark:text-white/65">
                    With no group selected, only app owners can open {area.label}.
                  </p>
                )}
              </>
            )}
            <Button
              size="sm"
              className="mt-auto w-full"
              loading={savingArea === area.key}
              disabled={!enforced || savingArea !== null}
              onClick={() => save(area.key)}
            >
              Save {area.label} access
            </Button>
          </Card>
        );
      })}
      {!enforced && (
        <p
          role="status"
          className="text-sm text-black/65 md:col-span-2 xl:col-span-3 dark:text-white/65"
        >
          Page access is not available yet on this workspace. Apply the pending
          database migrations and reload.
        </p>
      )}
    </div>
  );
}
