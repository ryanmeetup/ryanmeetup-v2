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
import {
  FiMoreHorizontal,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";
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

  async function renameWorkGroup(id: string, currentName: string) {
    const nextName = window.prompt("Update the name", currentName)?.trim();
    if (!nextName || nextName === currentName) return;
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
    toast.success(`${nextName} updated.`);
  }

  async function deleteWorkGroup(id: string) {
    if (
      !window.confirm(
        "Delete this category? It will be removed from its tasks.",
      )
    )
      return;
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
    toast.success("Category deleted.");
  }

  return (
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
              onClick={() => void renameWorkGroup(item.id, item.name)}
            >
              <FiMoreHorizontal />
            </IconButton>
            <IconButton
              label={`Delete ${item.name}`}
              onClick={() => void deleteWorkGroup(item.id)}
            >
              <FiTrash2 />
            </IconButton>
          </div>
        ))}
      </div>
      <form
        className="mt-5 grid gap-3 border-t border-black/10 pt-5 dark:border-white/10 lg:grid-cols-[minmax(16rem,1fr)_auto_auto_auto]"
        onSubmit={addWorkGroup}
      >
        <Input
          label="New category"
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
          disabled={creating}
        >
          Randomize
        </Button>
        <Button
          type="submit"
          variant="action"
          className="self-end"
          leftIcon={creating ? <Spinner className="h-4 w-4" /> : <FiPlus />}
          disabled={creating}
        >
          {creating ? "Creating" : "Create category"}
        </Button>
      </form>
    </Modal>
  );
}
