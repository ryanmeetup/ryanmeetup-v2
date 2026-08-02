"use client";

import {
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { Button, IconButton, Input, Modal, toast } from "@ryanmeetup/ui";
import { FiChevronDown, FiMoreHorizontal, FiTrash2 } from "react-icons/fi";
import type { WorkspaceData } from "@/lib/types";

const workGroupColors = [
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

function randomWorkGroupColor(exclude?: string) {
  const choices = workGroupColors.filter((option) => option !== exclude);
  return choices[Math.floor(Math.random() * choices.length)];
}

export type WorkGroupsModalProps = {
  open: boolean;
  setOpen: (value: boolean) => void;
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  demoMode: boolean;
};

export function WorkGroupsModal({
  open,
  setOpen,
  data,
  setData,
  demoMode,
}: WorkGroupsModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(() => randomWorkGroupColor());
  const [creating, setCreating] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function randomizeColor() {
    setColor((current) => randomWorkGroupColor(current));
  }

  async function addWorkGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const groupName = name.trim();
    if (!groupName) return;
    setCreating(true);
    let item = {
      id: crypto.randomUUID(),
      name: groupName,
      color,
      created_by: data.currentProfile.id,
    };
    if (!demoMode) {
      try {
        const response = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: groupName, color }),
        });
        const result = (await response.json()) as {
          error?: string;
          workGroup?: typeof item;
        };
        if (!response.ok || !result.workGroup) {
          toast.error(result.error ?? "The category could not be created.");
          return;
        }
        item = result.workGroup;
      } catch {
        toast.error("The category could not be created.");
        return;
      } finally {
        setCreating(false);
      }
    }
    setData((current) => ({
      ...current,
      categories: [...current.categories, item],
    }));
    setName("");
    setColor(randomWorkGroupColor(color));
    setCreating(false);
    toast.success(`${item.name} created.`);
  }

  function beginRename(id: string, currentName: string) {
    setDeletingId(null);
    setEditingId(id);
    setEditingName(currentName);
  }

  async function renameWorkGroup(id: string, currentName: string) {
    const nextName = editingName.trim();
    if (!nextName) return;
    if (nextName === currentName) {
      setEditingId(null);
      return;
    }
    if (!demoMode) {
      try {
        const response = await fetch("/api/categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, name: nextName }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) {
          toast.error(result.error ?? "The category could not be renamed.");
          return;
        }
      } catch {
        toast.error("The category could not be renamed.");
        return;
      }
    }
    setData((current) => ({
      ...current,
      categories: current.categories.map((item) =>
        item.id === id ? { ...item, name: nextName } : item,
      ),
    }));
    setEditingId(null);
    toast.success(`${nextName} updated.`);
  }

  async function deleteWorkGroup(id: string) {
    if (!demoMode) {
      try {
        const response = await fetch("/api/categories", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) {
          toast.error(result.error ?? "The category could not be deleted.");
          return;
        }
      } catch {
        toast.error("The category could not be deleted.");
        return;
      }
    }
    setData((current) => ({
      ...current,
      categories: current.categories.filter((item) => item.id !== id),
      taskCategories: current.taskCategories.filter(
        (item) => item.category_id !== id,
      ),
    }));
    setDeletingId(null);
    toast.success("Category deleted.");
  }

  return (
    <Modal
      open={open}
      setIsOpen={setOpen}
      title="Categories"
      hideActions
      size="xl"
      maxHeight="min(42rem, calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom))))"
    >
      <section>
        <button
          type="button"
          aria-expanded={categoriesExpanded}
          aria-controls="category-management-list"
          onClick={() => setCategoriesExpanded((expanded) => !expanded)}
          className="flex w-full items-center gap-2 rounded-lg py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-black/55 hover:text-black focus:outline-none focus-visible:text-black dark:text-white/55 dark:hover:text-white dark:focus-visible:text-white"
        >
          <FiChevronDown
            aria-hidden
            className={`transition-transform ${categoriesExpanded ? "" : "-rotate-90"}`}
          />
          Existing categories
          <span className="ml-auto rounded-full bg-black/5 px-2 py-0.5 text-[10px] dark:bg-white/10">
            {data.categories.length}
          </span>
        </button>
        {categoriesExpanded && (
          <div
            id="category-management-list"
            className="mt-3 grid gap-3 md:grid-cols-2"
          >
            {data.categories.map((item) => (
              <div
                key={item.id}
                className="min-w-0 rounded-xl border border-black/10 p-3 dark:border-white/10"
              >
                {editingId === item.id ? (
                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void renameWorkGroup(item.id, item.name);
                    }}
                  >
                    <Input
                      label={`Rename ${item.name}`}
                      name={`rename-category-${item.id}`}
                      hideLabel
                      autoFocus
                      required
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm">
                        Save
                      </Button>
                    </div>
                  </form>
                ) : deletingId === item.id ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Delete {item.name}?</p>
                    <p className="text-xs text-black/60 dark:text-white/60">
                      It will be removed from every task using it.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setDeletingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="action"
                        className="!border-red-700 !bg-red-700 !text-white hover:!bg-red-800"
                        onClick={() => void deleteWorkGroup(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-w-0 items-center gap-3">
                    <i
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {item.name}
                    </span>
                    <IconButton
                      label={`Rename ${item.name}`}
                      onClick={() => beginRename(item.id, item.name)}
                    >
                      <FiMoreHorizontal />
                    </IconButton>
                    <IconButton
                      label={`Delete ${item.name}`}
                      onClick={() => {
                        setEditingId(null);
                        setDeletingId(item.id);
                      }}
                    >
                      <FiTrash2 />
                    </IconButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      <form
        className="mt-5 grid gap-3 border-t border-black/10 pt-5 dark:border-white/10 lg:grid-cols-[minmax(16rem,1fr)_auto]"
        onSubmit={addWorkGroup}
      >
        <Input
          label="New category"
          name="category-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name"
        />
        <div className="flex items-end gap-3">
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
            className="shrink-0"
            onClick={randomizeColor}
            disabled={creating}
          >
            Randomize
          </Button>
        </div>
        <div className="flex justify-end gap-3 lg:col-span-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button type="submit" variant="action" disabled={creating}>
            {creating ? "Creating" : "Create category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
