"use client";

import {
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  Button,
  ConfirmationDialog,
  IconButton,
  Input,
  Modal,
  Pill,
  PromptDialog,
  toast,
} from "@ryanmeetup/ui";
import {
  FiCheck,
  FiChevronDown,
  FiEdit2,
  FiMoreHorizontal,
  FiRefreshCw,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { mutate } from "@/lib/mutation-client";
import type { WorkspaceData } from "@/lib/types";

const categoryColors = [
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#65a30d",
  "#059669",
  "#0891b2",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#c026d3",
  "#db2777",
  "#475569",
];
const archiveDelayMs = 14 * 24 * 60 * 60 * 1000;

function mutationErrorMessage(error: unknown, fallback: string) {
  return typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : fallback;
}

export function CategoriesModalLegacy({
  open,
  setOpen,
  data,
  setData,
  demoMode,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  demoMode: boolean;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ee1a25");
  const [message, setMessage] = useState("");
  const [groupToRename, setGroupToRename] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [groupActionPending, setGroupActionPending] = useState(false);

  function randomizeColor() {
    const choices = categoryColors.filter((option) => option !== color);
    setColor(choices[Math.floor(Math.random() * choices.length)]);
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const groupName = name.trim();
    if (!groupName) return;
    setMessage("");
    let item = {
      id: crypto.randomUUID(),
      name: groupName,
      description: null,
      color,
      links: [],
      created_by: data.currentProfile.id,
      archived_at: null,
    };
    if (!demoMode) {
      try {
        const result = await mutate<{ category: typeof item }>(
          "/api/categories",
          {
            method: "POST",
            body: JSON.stringify({
              name: item.name,
              description: item.description,
              color: item.color,
              links: item.links,
            }),
          },
        );
        item = result.category;
      } catch (error) {
        setMessage(mutationErrorMessage(error, "Category creation failed."));
        return;
      }
    }
    setData((current) => ({
      ...current,
      categories: [...current.categories, item],
    }));
    setName("");
    setMessage("Category created.");
  }

  async function renameCategory(
    id: string,
    currentName: string,
    nextName: string,
  ) {
    if (!nextName || nextName === currentName) return;
    setGroupActionPending(true);
    if (!demoMode) {
      try {
        const existing = data.categories.find((item) => item.id === id);
        await mutate("/api/categories", {
          method: "PATCH",
          body: JSON.stringify({
            id,
            name: nextName,
            description: existing?.description ?? null,
            color: existing?.color ?? "#475569",
          }),
        });
      } catch (error) {
        setMessage(mutationErrorMessage(error, "Category update failed."));
        setGroupActionPending(false);
        return;
      }
    }
    setData((current) => ({
      ...current,
      categories: current.categories.map((item) =>
        item.id === id ? { ...item, name: nextName } : item,
      ),
    }));
    setGroupToRename(null);
    setGroupActionPending(false);
  }

  return (
    <>
      <Modal
        open={open}
        setIsOpen={setOpen}
        title="Categories"
        hideActions
        size="xl"
      >
        <div className="space-y-3">
          {data.categories.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-black/10 p-3 dark:border-white/10"
            >
              <i
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="min-w-0 flex-1 truncate font-semibold">
                {item.name}
              </span>
              <IconButton
                label={`Rename ${item.name}`}
                onClick={() => setGroupToRename(item)}
              >
                <FiMoreHorizontal />
              </IconButton>
            </div>
          ))}
        </div>
        <form
          className="mt-5 grid gap-3 border-t border-black/10 pt-5 dark:border-white/10 lg:grid-cols-[minmax(16rem,1fr)_auto_auto_auto]"
          onSubmit={addCategory}
        >
          <Input
            label="New Category"
            name="category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
          />
          <label className="date-field">
            <span>Color</span>
            <input
              type="color"
              className="color-input"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            className="self-end"
            leftIcon={<FiRefreshCw />}
            onClick={randomizeColor}
          >
            Randomize
          </Button>
          <div className="flex items-end justify-end gap-2 lg:col-span-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="action">
              Create category
            </Button>
          </div>
          {message && (
            <p
              role="status"
              className="text-sm text-black/60 dark:text-white/60 sm:col-span-3"
            >
              {message}
            </p>
          )}
        </form>
      </Modal>
      <PromptDialog
        open={Boolean(groupToRename)}
        setOpen={(nextOpen) => {
          if (!nextOpen) setGroupToRename(null);
        }}
        title="Rename category"
        label="Category name"
        initialValue={groupToRename?.name}
        pending={groupActionPending}
        onConfirm={(nextName) => {
          if (groupToRename)
            void renameCategory(groupToRename.id, groupToRename.name, nextName);
        }}
      />
    </>
  );
}

export function StatusSettingsModal({
  open,
  setOpen,
  data,
  setData,
  demoMode,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  demoMode: boolean;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ee1a25");
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingStatusName, setEditingStatusName] = useState("");
  const [statusToDelete, setStatusToDelete] = useState<
    WorkspaceData["statuses"][number] | null
  >(null);
  const [settingActionPending, setSettingActionPending] = useState(false);

  async function statusRequest<T>(
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, unknown>,
  ) {
    const response = await fetch("/api/statuses", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as T & { error?: string };
    if (!response.ok || result.error)
      throw new Error(result.error ?? "The status change could not be saved.");
    return result;
  }

  async function add() {
    const nextName = name.trim();
    if (!nextName || settingActionPending) return;
    setSettingActionPending(true);
    let item: WorkspaceData["statuses"][number] = {
      id: crypto.randomUUID(),
      name: nextName,
      color,
      sort_order: data.statuses.length,
      order_revision: data.statuses[0]?.order_revision ?? 0,
      is_default: false,
      is_completed: false,
    };
    try {
      if (!demoMode) {
        const result = await statusRequest<{ status: typeof item }>("POST", {
          name: item.name,
          color: item.color,
        });
        item = result.status;
      }
      setData((current) => ({
        ...current,
        statuses: [...current.statuses, item],
      }));
      setName("");
      toast.success(`${item.name} added.`);
    } catch (error) {
      toast.error(
        mutationErrorMessage(error, "The status could not be added."),
      );
    } finally {
      setSettingActionPending(false);
    }
  }

  async function renameSetting(
    id: string,
    currentName: string,
    nextName: string,
  ) {
    if (!nextName) return;
    if (nextName === currentName) {
      setEditingStatusId(null);
      setEditingStatusName("");
      return;
    }
    setSettingActionPending(true);
    try {
      if (!demoMode) {
        await statusRequest("PATCH", { id, name: nextName });
      }
      setData((current) => ({
        ...current,
        statuses: current.statuses.map((item) =>
          item.id === id ? { ...item, name: nextName } : item,
        ),
      }));
      setEditingStatusId(null);
      setEditingStatusName("");
      toast.success(`${nextName} updated.`);
    } catch (error) {
      toast.error(
        mutationErrorMessage(error, "The status could not be renamed."),
      );
    } finally {
      setSettingActionPending(false);
    }
  }

  async function deleteSetting(id: string) {
    setSettingActionPending(true);
    try {
      if (!demoMode) await statusRequest("DELETE", { id });
      setData((current) => ({
        ...current,
        statuses: current.statuses.filter((item) => item.id !== id),
      }));
      setStatusToDelete(null);
      toast.success("Status deleted.");
    } catch (error) {
      toast.error(
        mutationErrorMessage(error, "The status could not be deleted."),
      );
    } finally {
      setSettingActionPending(false);
    }
  }

  async function toggleCompletedStatus(id: string, isCompleted: boolean) {
    setSettingActionPending(true);
    try {
      if (!demoMode) {
        await statusRequest("PATCH", { id, isCompleted });
      }
      const now = new Date().toISOString();
      setData((current) => ({
        ...current,
        statuses: current.statuses.map((item) =>
          item.id === id ? { ...item, is_completed: isCompleted } : item,
        ),
        tasks: current.tasks.map((task) => {
          if (task.status_id !== id) return task;
          return {
            ...task,
            ...(isCompleted
              ? {
                  completed_at: task.completed_at ?? now,
                  archived_at:
                    task.archived_at ??
                    new Date(
                      new Date(now).getTime() + archiveDelayMs,
                    ).toISOString(),
                }
              : { completed_at: null, archived_at: null }),
          };
        }),
      }));
      toast.success(
        isCompleted
          ? "Tasks in this status will archive after 14 days."
          : "This is now an active status.",
      );
    } catch (error) {
      toast.error(
        mutationErrorMessage(error, "The status could not be updated."),
      );
    } finally {
      setSettingActionPending(false);
    }
  }

  async function moveStatus(id: string, direction: -1 | 1) {
    if (settingActionPending) return;
    const ordered = [...data.statuses].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const index = ordered.findIndex((item) => item.id === id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return;
    [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];
    const next = ordered.map((item, sort_order) => ({ ...item, sort_order }));
    setSettingActionPending(true);
    try {
      if (!demoMode) {
        const result = await statusRequest<{
          statuses: WorkspaceData["statuses"];
        }>("PATCH", {
          orderedIds: next.map((item) => item.id),
          expectedRevision: ordered[0]?.order_revision ?? 0,
        });
        const savedById = new Map(
          result.statuses.map((status) => [status.id, status]),
        );
        next.splice(
          0,
          next.length,
          ...next.map((status) => savedById.get(status.id) ?? status),
        );
      }
      setData((current) => ({ ...current, statuses: next }));
    } catch (error) {
      toast.error(
        mutationErrorMessage(error, "The status order could not be saved."),
      );
    } finally {
      setSettingActionPending(false);
    }
  }
  return (
    <>
      <Modal
        open={open}
        setIsOpen={setOpen}
        title="Status settings"
        description="Completion statuses mark tasks complete when they enter the column and automatically archive them after 14 days. Moving a task back to an active status reopens it."
        hideActions
        size="lg"
        maxHeight="min(42rem, calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom))))"
        footer={
          <form
            id="create-status-form"
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void add();
            }}
          >
            <Input
              label="New status"
              name="setting-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name"
            />
            <label className="date-field">
              <span>Color</span>
              <input
                type="color"
                className="color-input"
                value={color}
                onChange={(event) => setColor(event.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={settingActionPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                loading={settingActionPending}
                loadingText="Adding..."
              >
                Add status
              </Button>
            </div>
          </form>
        }
      >
        <>
          <div className="space-y-3">
            {[...data.statuses]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-black/10 p-3 dark:border-white/10"
                >
                  <i
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {editingStatusId === item.id ? (
                    <form
                      className="flex min-w-0 flex-1 items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void renameSetting(
                          item.id,
                          item.name,
                          editingStatusName.trim(),
                        );
                      }}
                    >
                      <Input
                        label={`Status name for ${item.name}`}
                        hideLabel
                        name={`status-name-${item.id}`}
                        value={editingStatusName}
                        onChange={(event) =>
                          setEditingStatusName(event.target.value)
                        }
                        inputClassName="h-9"
                        autoFocus
                      />
                      <IconButton
                        type="submit"
                        label={`Save ${item.name}`}
                        disabled={
                          settingActionPending || !editingStatusName.trim()
                        }
                      >
                        <FiCheck />
                      </IconButton>
                      <IconButton
                        type="button"
                        label={`Cancel editing ${item.name}`}
                        disabled={settingActionPending}
                        onClick={() => {
                          setEditingStatusId(null);
                          setEditingStatusName("");
                        }}
                      >
                        <FiX />
                      </IconButton>
                    </form>
                  ) : (
                    <span className="flex-1 font-semibold">{item.name}</span>
                  )}
                  {editingStatusId !== item.id && (
                    <>
                      {"is_default" in item && item.is_default && (
                        <Pill size="sm">Default</Pill>
                      )}
                      <button
                        type="button"
                        aria-label={`${item.name} ${item.is_completed ? "currently completes tasks and archives them after 14 days" : "is an active workflow status"}`}
                        aria-pressed={item.is_completed}
                        disabled={settingActionPending}
                        onClick={() =>
                          void toggleCompletedStatus(
                            item.id,
                            !item.is_completed,
                          )
                        }
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-black/20 disabled:opacity-50 dark:focus:ring-white/30 ${item.is_completed ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200" : "border-black/10 text-black/60 hover:text-black dark:border-white/10 dark:text-white/60 dark:hover:text-white"}`}
                      >
                        {item.is_completed
                          ? "Completes tasks"
                          : "Set as completion"}
                      </button>
                      <IconButton
                        label={`Move ${item.name} up`}
                        onClick={() => void moveStatus(item.id, -1)}
                      >
                        <FiChevronDown className="rotate-180" />
                      </IconButton>
                      <IconButton
                        label={`Move ${item.name} down`}
                        onClick={() => void moveStatus(item.id, 1)}
                      >
                        <FiChevronDown />
                      </IconButton>
                      <IconButton
                        label={`Edit ${item.name}`}
                        disabled={settingActionPending}
                        onClick={() => {
                          setEditingStatusId(item.id);
                          setEditingStatusName(item.name);
                        }}
                      >
                        <FiEdit2 />
                      </IconButton>
                      <IconButton
                        label={`Delete ${item.name}`}
                        variant="danger"
                        onClick={() => setStatusToDelete(item)}
                      >
                        <FiTrash2 />
                      </IconButton>
                    </>
                  )}
                </div>
              ))}
          </div>
        </>
      </Modal>
      <ConfirmationDialog
        open={Boolean(statusToDelete)}
        setOpen={(nextOpen) => {
          if (!nextOpen) setStatusToDelete(null);
        }}
        title="Delete status?"
        description={
          statusToDelete &&
          "is_default" in statusToDelete &&
          statusToDelete.is_default
            ? "This is a default status. Tasks using it must be moved before it can be deleted."
            : "This shared status will be permanently deleted."
        }
        confirmLabel="Delete status"
        pendingLabel="Deleting..."
        pending={settingActionPending}
        destructive
        onConfirm={() => {
          if (statusToDelete) void deleteSetting(statusToDelete.id);
        }}
      />
    </>
  );
}
