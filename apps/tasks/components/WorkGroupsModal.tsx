"use client";

import {
  useMemo,
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
  Textarea,
  toast,
} from "@ryanmeetup/ui";
import { useSearchFilter } from "@ryanmeetup/hooks";
import {
  FiArrowRight,
  FiEdit2,
  FiLoader,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import { withAccessPreview } from "@/lib/access-preview";
import type { Category, WorkspaceData } from "@/lib/types";

function randomCategoryColor(exclude?: string) {
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
  embedded?: boolean;
  createOnly?: boolean;
};

export function WorkGroupsModal({
  open,
  setOpen,
  data,
  setData,
  demoMode,
  embedded = false,
  createOnly = false,
}: WorkGroupsModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(() => randomCategoryColor());
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingColor, setEditingColor] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const {
    query,
    setQuery,
    filtered: searchedCategories,
    isPending: searchPending,
  } = useSearchFilter({
    data: data.categories,
    buildHaystack: (category) =>
      `${category.name} ${category.description ?? ""}`.toLowerCase(),
    queryParam: "category-search",
  });
  const categories = useMemo(
    () => [...searchedCategories].sort((a, b) => a.name.localeCompare(b.name)),
    [searchedCategories],
  );

  async function request(method: "POST" | "PATCH" | "DELETE", body: object) {
    const response = await fetch("/api/categories", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as {
      error?: string;
      workGroup?: Category;
    };
    if (!response.ok)
      throw new Error(result.error ?? "The category could not be updated.");
    return result;
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) return;
    setCreating(true);
    try {
      let category: Category = {
        id: crypto.randomUUID(),
        name: nextName,
        description: description.trim() || null,
        color,
        created_by: data.currentProfile.id,
      };
      if (!demoMode)
        category = (
          await request("POST", { name: nextName, description, color })
        ).workGroup!;
      setData((current) => ({
        ...current,
        categories: [...current.categories, category],
      }));
      setName("");
      setDescription("");
      setColor(randomCategoryColor(color));
      toast.success(`${category.name} created.`);
      if (createOnly) setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The category could not be created.",
      );
    } finally {
      setCreating(false);
    }
  }

  function beginEdit(category: Category) {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditingDescription(category.description ?? "");
    setEditingColor(category.color);
  }

  async function updateCategory(category: Category) {
    const nextName = editingName.trim();
    if (!nextName) return;
    const nextDescription = editingDescription.trim() || null;
    setSaving(true);
    try {
      if (!demoMode)
        await request("PATCH", {
          id: category.id,
          name: nextName,
          description: nextDescription,
          color: editingColor,
        });
      setData((current) => ({
        ...current,
        categories: current.categories.map((item) =>
          item.id === category.id
            ? {
                ...item,
                name: nextName,
                description: nextDescription,
                color: editingColor,
              }
            : item,
        ),
      }));
      setEditingId(null);
      toast.success(`${nextName} updated.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The category could not be updated.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category: Category) {
    setDeleting(true);
    try {
      if (!demoMode) await request("DELETE", { id: category.id });
      setData((current) => ({
        ...current,
        categories: current.categories.filter(
          (item) => item.id !== category.id,
        ),
        taskCategories: current.taskCategories.filter(
          (item) => item.category_id !== category.id,
        ),
      }));
      setPendingDelete(null);
      toast.success(`${category.name} deleted.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The category could not be deleted.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const colorControl = (
    currentColor: string,
    setCurrentColor: (value: string) => void,
    disabled: boolean,
  ) => (
    <div className="flex items-end gap-1">
      <label className="date-field">
        <span>Color</span>
        <input
          type="color"
          className="color-input !h-10 !w-10"
          value={currentColor}
          onChange={(event) => setCurrentColor(event.target.value)}
          disabled={disabled}
        />
      </label>
      <IconButton
        label="Randomize category color"
        size="md"
        onClick={() => setCurrentColor(randomCategoryColor(currentColor))}
        disabled={disabled}
      >
        <FiRefreshCw />
      </IconButton>
    </div>
  );

  return (
    <>
      <Modal
        open={open}
        setIsOpen={setOpen}
        title={embedded ? null : createOnly ? "New category" : "Categories"}
        hideActions
        size={createOnly ? "md" : "xl"}
        embedded={embedded}
        maxHeight="min(42rem, calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom))))"
        footer={
          embedded ? undefined : (
            <form className="grid gap-4" onSubmit={addCategory}>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  label="Category name"
                  name="category-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Marketing"
                  disabled={creating}
                />
                {colorControl(color, setColor, creating)}
              </div>
              <Textarea
                id="category-description"
                label="Description"
                name="category-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What kind of work belongs in this category?"
                rows={2}
                disabled={creating}
              />
              <div className="flex justify-end gap-2 border-t border-black/10 pt-4 dark:border-white/10">
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
          )
        }
      >
        {createOnly ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            Give related work a recognizable label and color. You can edit or
            delete it from the Categories page later.
          </p>
        ) : (
          <>
            <p className="mb-5 text-sm text-black/60 dark:text-white/60">
              Categories make work easier to scan and filter across projects.
            </p>
            <div className="relative mb-4">
              <Input
                label="Search categories"
                name="category-search"
                hideLabel
                leadingIcon={<FiSearch aria-hidden />}
                aria-busy={searchPending}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search categories..."
                inputClassName="pr-10"
              />
              {searchPending && (
                <span
                  role="status"
                  aria-label="Loading category results"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/45 dark:text-white/45"
                >
                  <FiLoader className="animate-spin motion-reduce:animate-none" />
                </span>
              )}
            </div>
            <div className="relative" aria-busy={searchPending}>
              {searchPending && (
                <div
                  role="status"
                  aria-label="Loading category results"
                  className="absolute inset-0 z-10 grid min-h-40 place-items-center rounded-xl bg-white/80 backdrop-blur-sm dark:bg-[#181818]/80"
                >
                  <span className="flex items-center gap-3 rounded-xl border border-black/15 bg-white px-5 py-3 text-sm font-semibold shadow-lg dark:border-white/15 dark:bg-[#181818]">
                    <FiLoader className="h-5 w-5 animate-spin motion-reduce:animate-none" />
                    Loading categories
                  </span>
                </div>
              )}
              <div
                className={`${searchPending ? "pointer-events-none opacity-55" : ""} grid auto-rows-fr items-stretch gap-4 transition-opacity md:grid-cols-2 ${embedded ? "xl:grid-cols-3" : ""}`}
              >
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex h-full flex-col rounded-xl border border-black/10 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.025]"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-1 h-4 w-4 shrink-0 rounded-full ring-4 ring-black/5 dark:ring-white/5"
                        style={{ backgroundColor: category.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {category.name}
                        </p>
                        {category.description && (
                          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-black/60 dark:text-white/60">
                            {category.description}
                          </p>
                        )}
                      </div>
                      <IconButton
                        label={`Edit ${category.name}`}
                        onClick={() => beginEdit(category)}
                      >
                        <FiEdit2 />
                      </IconButton>
                      <IconButton
                        label={`Delete ${category.name}`}
                        variant="danger"
                        onClick={() => setPendingDelete(category)}
                      >
                        <FiTrash2 />
                      </IconButton>
                    </div>
                    {embedded && (
                      <div className="mt-auto flex justify-end pt-3">
                        <Button.Link
                          href={withAccessPreview(
                            `/?category=${encodeURIComponent(category.name)}`,
                            data.accessPreview,
                          )}
                          variant="secondary"
                          size="sm"
                          rightIcon={<FiArrowRight aria-hidden />}
                        >
                          Open board
                        </Button.Link>
                      </div>
                    )}
                  </div>
                ))}
                {categories.length === 0 && (
                  <div
                    className={`rounded-xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-black/55 dark:border-white/10 dark:text-white/55 md:col-span-2 ${embedded ? "xl:col-span-3" : ""}`}
                  >
                    No categories match this search.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>

      {editingId &&
        (() => {
          const category = data.categories.find(
            (item) => item.id === editingId,
          );
          if (!category) return null;
          return (
            <Modal
              open
              setIsOpen={(nextOpen) => {
                if (!nextOpen && !saving) setEditingId(null);
              }}
              title={`Edit ${category.name}`}
              size="md"
              hideActions
            >
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void updateCategory(category);
                }}
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    label="Category name"
                    name={`edit-category-${category.id}`}
                    required
                    autoFocus
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    disabled={saving}
                  />
                  {colorControl(editingColor, setEditingColor, saving)}
                </div>
                <Textarea
                  id={`edit-category-description-${category.id}`}
                  label="Description"
                  name={`edit-category-description-${category.id}`}
                  value={editingDescription}
                  onChange={(event) =>
                    setEditingDescription(event.target.value)
                  }
                  placeholder="What kind of work belongs here?"
                  rows={3}
                  disabled={saving}
                />
                <div className="flex justify-end gap-2 border-t border-black/10 pt-4 dark:border-white/10">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingId(null)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={saving}
                    loadingText="Saving..."
                  >
                    Save changes
                  </Button>
                </div>
              </form>
            </Modal>
          );
        })()}

      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        setOpen={(nextOpen) => {
          if (!nextOpen && !deleting) setPendingDelete(null);
        }}
        title="Delete category?"
        description="This category will be removed from every task using it. This cannot be undone."
        confirmLabel="Delete category"
        pendingLabel="Deleting..."
        pending={deleting}
        destructive
        onConfirm={() => {
          if (pendingDelete) void deleteCategory(pendingDelete);
        }}
      />
    </>
  );
}
