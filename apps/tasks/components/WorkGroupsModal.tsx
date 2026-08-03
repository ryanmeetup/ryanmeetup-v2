"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { Button, IconButton, Input, Modal, toast } from "@ryanmeetup/ui";
import { FiChevronDown, FiEdit2, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import type { WorkspaceData } from "@/lib/types";

function randomWorkGroupColor(exclude?: string) {
  let color: string;
  do {
    color = `#${Math.floor(Math.random() * 0x1000000)
      .toString(16)
      .padStart(6, "0")}`;
  } while (color === exclude);
  return color;
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
  const [editingColor, setEditingColor] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const categoryElements = useRef(new Map<string, HTMLDivElement>());
  const previousCategoryPositions = useRef<Map<string, DOMRect> | null>(null);

  useLayoutEffect(() => {
    const previousPositions = previousCategoryPositions.current;
    if (!previousPositions) return;
    previousCategoryPositions.current = null;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    categoryElements.current.forEach((element, id) => {
      const previous = previousPositions.get(id);
      if (!previous) return;
      const next = element.getBoundingClientRect();
      const deltaX = previous.left - next.left;
      const deltaY = previous.top - next.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
      element.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    });
  }, [editingId]);

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

  function beginEdit(id: string, currentName: string, currentColor: string) {
    previousCategoryPositions.current = new Map(
      [...categoryElements.current].map(([categoryId, element]) => [
        categoryId,
        element.getBoundingClientRect(),
      ]),
    );
    setDeletingId(null);
    setEditingId(id);
    setEditingName(currentName);
    setEditingColor(currentColor);
    window.requestAnimationFrame(() => {
      document.getElementById(`edit-category-${id}`)?.focus();
    });
  }

  async function updateWorkGroup(
    id: string,
    currentName: string,
    currentColor: string,
  ) {
    const nextName = editingName.trim();
    if (!nextName) return;
    if (nextName === currentName && editingColor === currentColor) {
      setEditingId(null);
      return;
    }
    if (!demoMode) {
      try {
        const response = await fetch("/api/categories", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, name: nextName, color: editingColor }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) {
          toast.error(result.error ?? "The category could not be updated.");
          return;
        }
      } catch {
        toast.error("The category could not be updated.");
        return;
      }
    }
    setData((current) => ({
      ...current,
      categories: current.categories.map((item) =>
        item.id === id
          ? { ...item, name: nextName, color: editingColor }
          : item,
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
      footer={
        <form
          id="create-category-form"
          className="grid gap-4"
          onSubmit={addWorkGroup}
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_auto]">
            <Input
              label="New category"
              name="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name"
            />
            <div className="flex items-end gap-1">
              <label className="date-field">
                <span>Color</span>
                <input
                  type="color"
                  className="color-input !h-10 !w-10"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                />
              </label>
              <IconButton
                label="Randomize category color"
                size="md"
                onClick={randomizeColor}
                disabled={creating}
              >
                <FiRefreshCw />
              </IconButton>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-black/10 pt-4 dark:border-white/10">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="action"
              loading={creating}
              loadingText="Creating..."
            >
              Create category
            </Button>
          </div>
        </form>
      }
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
            className="mt-3 columns-1 gap-3 md:columns-2"
          >
            {data.categories.map((item) => (
              <div
                key={item.id}
                ref={(element) => {
                  if (element) categoryElements.current.set(item.id, element);
                  else categoryElements.current.delete(item.id);
                }}
                className="mb-3 min-w-0 break-inside-avoid rounded-xl border border-black/10 p-3 dark:border-white/10"
              >
                {deletingId === item.id ? (
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
                        variant="danger"
                        onClick={() => void deleteWorkGroup(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex min-w-0 items-center gap-3">
                      <i
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {item.name}
                      </span>
                      <IconButton
                        label={`Edit ${item.name}`}
                        onClick={() =>
                          beginEdit(item.id, item.name, item.color)
                        }
                      >
                        <FiEdit2 />
                      </IconButton>
                      <IconButton
                        label={`Delete ${item.name}`}
                        variant="danger"
                        onClick={() => {
                          setEditingId(null);
                          setDeletingId(item.id);
                        }}
                      >
                        <FiTrash2 />
                      </IconButton>
                    </div>
                    <div
                      aria-hidden={editingId !== item.id}
                      inert={editingId !== item.id ? true : undefined}
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                        editingId === item.id
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <form
                          className="mt-3 space-y-3 border-t border-black/10 pt-3 dark:border-white/10"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void updateWorkGroup(
                              item.id,
                              item.name,
                              item.color,
                            );
                          }}
                        >
                          <Input
                            id={`edit-category-${item.id}`}
                            label={`Name for ${item.name}`}
                            name={`edit-category-${item.id}`}
                            hideLabel
                            required
                            value={editingName}
                            onChange={(event) =>
                              setEditingName(event.target.value)
                            }
                          />
                          <div className="flex items-end justify-between gap-3">
                            <div className="flex items-end gap-0">
                              <label className="date-field">
                                <span>Color</span>
                                <input
                                  type="color"
                                  className="color-input !h-8 !w-8"
                                  value={editingColor}
                                  onChange={(event) =>
                                    setEditingColor(event.target.value)
                                  }
                                />
                              </label>
                              <IconButton
                                label="Randomize category color"
                                onClick={() =>
                                  setEditingColor((current) =>
                                    randomWorkGroupColor(current),
                                  )
                                }
                              >
                                <FiRefreshCw />
                              </IconButton>
                            </div>
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
                          </div>
                        </form>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </Modal>
  );
}
