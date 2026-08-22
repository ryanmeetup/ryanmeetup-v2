"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  Button,
  Card,
  ConfirmationDialog,
  IconButton,
  Input,
  Pill,
  Textarea,
  Tooltip,
  toast,
} from "@ryanmeetup/ui";
import {
  FiCheckCircle,
  FiChevronDown,
  FiCircle,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import { ManagementCardTitle } from "@/components/global";
import { errorMessage } from "@/lib/presentation";
import { mutate } from "@/lib/mutation-client";

const archiveDelayMs = 14 * 24 * 60 * 60 * 1000;

/**
 * Owner-only status management, rendered as a page section at /admin/statuses.
 * It was a header modal until the admin section gave it a permanent home.
 */
export function StatusSettings({
  data,
  setData,
  demoMode,
}: {
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  demoMode: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#ee1a25");
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingStatusName, setEditingStatusName] = useState("");
  const [editingStatusDescription, setEditingStatusDescription] = useState("");
  const [editingStatusColor, setEditingStatusColor] = useState("#ee1a25");
  const [statusToDelete, setStatusToDelete] = useState<
    WorkspaceData["statuses"][number] | null
  >(null);
  const [settingActionPending, setSettingActionPending] = useState(false);

  async function statusRequest<T>(
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, unknown>,
  ) {
    return mutate<T>("/api/statuses", {
      method,
      body: JSON.stringify(body),
    });
  }

  async function add() {
    const nextName = name.trim();
    if (!nextName || settingActionPending) return;
    setSettingActionPending(true);
    let item: WorkspaceData["statuses"][number] = {
      id: crypto.randomUUID(),
      name: nextName,
      description: description.trim() || null,
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
          description: item.description,
          color: item.color,
        });
        item = result.status;
      }
      setData((current) => ({
        ...current,
        statuses: [...current.statuses, item],
      }));
      setName("");
      setDescription("");
      toast.success(`${item.name} added.`);
    } catch (error) {
      toast.error(
        errorMessage(error, "The status could not be added."),
      );
    } finally {
      setSettingActionPending(false);
    }
  }

  function beginEdit(item: WorkspaceData["statuses"][number]) {
    setEditingStatusId(item.id);
    setEditingStatusName(item.name);
    setEditingStatusDescription(item.description ?? "");
    setEditingStatusColor(item.color);
  }

  function cancelEdit() {
    setEditingStatusId(null);
    setEditingStatusName("");
    setEditingStatusDescription("");
  }

  /** Saves only the fields the owner actually changed. */
  async function saveSetting(current: WorkspaceData["statuses"][number]) {
    const nextName = editingStatusName.trim();
    if (!nextName || settingActionPending) return;
    const nextDescription = editingStatusDescription.trim() || null;
    const changes = {
      ...(nextName !== current.name ? { name: nextName } : {}),
      ...(nextDescription !== (current.description ?? null)
        ? { description: nextDescription }
        : {}),
      ...(editingStatusColor !== current.color
        ? { color: editingStatusColor }
        : {}),
    };
    if (Object.keys(changes).length === 0) {
      cancelEdit();
      return;
    }
    setSettingActionPending(true);
    try {
      if (!demoMode) {
        await statusRequest("PATCH", { id: current.id, ...changes });
      }
      setData((workspace) => ({
        ...workspace,
        statuses: workspace.statuses.map((item) =>
          item.id === current.id
            ? {
                ...item,
                name: nextName,
                description: nextDescription,
                color: editingStatusColor,
              }
            : item,
        ),
      }));
      cancelEdit();
      toast.success(`${nextName} updated.`);
    } catch (error) {
      toast.error(errorMessage(error, "The status could not be saved."));
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
        errorMessage(error, "The status could not be deleted."),
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
        errorMessage(error, "The status could not be updated."),
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
        errorMessage(error, "The status order could not be saved."),
      );
    } finally {
      setSettingActionPending(false);
    }
  }
  return (
    <div className="space-y-6">
      <p className="text-sm leading-6 text-black/70 dark:text-white/70">
        Completion statuses mark tasks complete when they enter the column and
        automatically archive them after 14 days. Moving a task back to an
        active status reopens it.
      </p>

      <div className="space-y-3">
        {[...data.statuses]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item, index, ordered) => (
            <div
              key={item.id}
              className="rounded-xl border border-black/10 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.025]"
            >
              {editingStatusId === item.id ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveSetting(item);
                  }}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                    <Input
                      label="Status name"
                      name={`status-name-${item.id}`}
                      value={editingStatusName}
                      onChange={(event) =>
                        setEditingStatusName(event.target.value)
                      }
                      disabled={settingActionPending}
                      autoFocus
                      required
                      maxLength={80}
                    />
                    <label className="date-field">
                      <span>
                        Color <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="color"
                        aria-label={`Color for ${item.name}`}
                        className="color-input !h-11 !w-11"
                        value={editingStatusColor}
                        disabled={settingActionPending}
                        required
                        onChange={(event) =>
                          setEditingStatusColor(event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <Textarea
                    id={`status-description-${item.id}`}
                    label="Brief description"
                    name={`status-description-${item.id}`}
                    value={editingStatusDescription}
                    onChange={(event) =>
                      setEditingStatusDescription(event.target.value)
                    }
                    placeholder="What belongs in this column?"
                    disabled={settingActionPending}
                    maxLength={240}
                    rows={2}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={cancelEdit}
                      disabled={settingActionPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!editingStatusName.trim()}
                      loading={settingActionPending}
                      loadingText="Saving..."
                    >
                      Save changes
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                  <span
                    aria-hidden
                    className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-inset ring-black/10 dark:ring-white/20"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 font-semibold">{item.name}</span>
                      {"is_default" in item && item.is_default && (
                        <Tooltip content="Built-in status. Tasks must be moved before it can be deleted.">
                          <span className="inline-flex">
                            <Pill
                              variant="neutral"
                              size="sm"
                              className="!px-2 !py-0.5 !text-[10px] font-medium !tracking-[0.12em]"
                            >
                              Default
                            </Pill>
                          </span>
                        </Tooltip>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-black/60 dark:text-white/60">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Tooltip
                      content={
                        item.is_completed
                          ? "Tasks here are complete and archive after 14 days. Select to make it an active status."
                          : "Select to make this status complete tasks."
                      }
                    >
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
                        className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition focus:outline-none focus:ring-2 focus:ring-black/20 disabled:opacity-50 dark:focus:ring-white/30 ${item.is_completed ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200" : "border-black/10 text-black/50 hover:border-black/25 hover:text-black dark:border-white/10 dark:text-white/50 dark:hover:border-white/25 dark:hover:text-white"}`}
                      >
                        {item.is_completed ? (
                          <FiCheckCircle aria-hidden className="h-3.5 w-3.5" />
                        ) : (
                          <FiCircle aria-hidden className="h-3.5 w-3.5" />
                        )}
                        {item.is_completed
                          ? "Completes tasks"
                          : "Active status"}
                      </button>
                    </Tooltip>
                    <span
                      aria-hidden
                      className="h-6 w-px bg-black/10 dark:bg-white/10"
                    />
                    <div className="flex items-center gap-1.5">
                      <IconButton
                        className="disabled:opacity-40"
                        label={`Move “${item.name}” up`}
                        disabled={settingActionPending || index === 0}
                        onClick={() => void moveStatus(item.id, -1)}
                      >
                        <FiChevronDown className="rotate-180" />
                      </IconButton>
                      <IconButton
                        className="disabled:opacity-40"
                        label={`Move “${item.name}” down`}
                        disabled={
                          settingActionPending || index === ordered.length - 1
                        }
                        onClick={() => void moveStatus(item.id, 1)}
                      >
                        <FiChevronDown />
                      </IconButton>
                      <IconButton
                        label={`Edit “${item.name}”`}
                        variant="edit"
                        disabled={settingActionPending}
                        onClick={() => beginEdit(item)}
                      >
                        <FiEdit2 />
                      </IconButton>
                      <IconButton
                        label={`Delete “${item.name}”`}
                        variant="danger"
                        disabled={settingActionPending}
                        onClick={() => setStatusToDelete(item)}
                      >
                        <FiTrash2 />
                      </IconButton>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>

      <Card size="lg">
        <ManagementCardTitle>New status</ManagementCardTitle>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Adds a column to every board in the workspace.
        </p>
        <form
          id="create-status-form"
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <Input
              label="Status name"
              required
              name="setting-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Blocked"
            />
            <label className="date-field">
              <span>
                Color <span className="text-red-500">*</span>
              </span>
              <input
                type="color"
                className="color-input !h-11 !w-11"
                value={color}
                required
                onChange={(event) => setColor(event.target.value)}
              />
            </label>
          </div>
          <Textarea
            id="setting-description"
            label="Brief description"
            name="setting-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What belongs in this column?"
            maxLength={240}
            rows={2}
          />
          <div className="flex justify-end">
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
      </Card>

      <ConfirmationDialog
        open={Boolean(statusToDelete)}
        setOpen={(nextOpen) => {
          if (!nextOpen) setStatusToDelete(null);
        }}
        title="Delete Status?"
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
    </div>
  );
}
