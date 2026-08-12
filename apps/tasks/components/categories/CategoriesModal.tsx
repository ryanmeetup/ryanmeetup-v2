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
  FilterChip,
  IconButton,
  Input,
  Modal,
  Textarea,
  Tooltip,
  toast,
} from "@ryanmeetup/ui";
import { useSearchFilter } from "@ryanmeetup/hooks";
import {
  FiArchive,
  FiArrowRight,
  FiEdit2,
  FiLoader,
  FiPlus,
  FiRefreshCw,
  FiRotateCcw,
  FiSearch,
} from "react-icons/fi";
import { withAccessPreview } from "@/lib/access-preview";
import { ManagementCard } from "@/components/global";
import type { Category, ProjectLink, WorkspaceData } from "@/lib/types";
import { LinksFields } from "@/components/projects/LinksFields";
import {
  ProjectAttachments,
  type ProjectAttachmentDraft,
} from "@/components/projects/ProjectAttachments";
import { ProjectLinks } from "@/components/projects/ProjectLinks";

function randomCategoryColor(exclude?: string) {
  let color: string;
  do {
    color = `#${Math.floor(Math.random() * 0x1000000)
      .toString(16)
      .padStart(6, "0")}`;
  } while (color === exclude);
  return color;
}

export type CategoriesModalProps = {
  open: boolean;
  setOpen: (value: boolean) => void;
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  demoMode: boolean;
  embedded?: boolean;
  createOnly?: boolean;
  editCategoryId?: string | null;
  onCreate?: () => void;
  onCategoryUpdated?: (category: Category) => void;
  readOnly?: boolean;
};

export function CategoriesModal({
  open,
  setOpen,
  data,
  setData,
  demoMode,
  embedded = false,
  createOnly = false,
  editCategoryId = null,
  onCreate,
  onCategoryUpdated,
  readOnly = false,
}: CategoriesModalProps) {
  const directEditCategory = editCategoryId
    ? (data.categories.find((category) => category.id === editCategoryId) ??
      null)
    : null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(() => randomCategoryColor());
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [attachments, setAttachments] = useState<ProjectAttachmentDraft[]>([]);
  const [creating, setCreating] = useState(false);
  const [categoryStatus, setCategoryStatus] = useState<
    "active" | "archived" | "all"
  >("active");
  const [editingId, setEditingId] = useState<string | null>(
    directEditCategory?.id ?? null,
  );
  const [editingName, setEditingName] = useState(
    directEditCategory?.name ?? "",
  );
  const [editingDescription, setEditingDescription] = useState(
    directEditCategory?.description ?? "",
  );
  const [editingColor, setEditingColor] = useState(
    directEditCategory?.color ?? "",
  );
  const [editingLinks, setEditingLinks] = useState<ProjectLink[]>(
    directEditCategory?.links ?? [],
  );
  const [saving, setSaving] = useState(false);
  const {
    query,
    setQuery,
    filtered: searchedCategories,
    isPending: searchPending,
  } = useSearchFilter({
    data: data.categories,
    buildHaystack: (category) =>
      `${category.name} ${category.description ?? ""} ${(category.links ?? []).map((link) => `${link.label} ${link.url}`).join(" ")}`.toLowerCase(),
    queryParam: "category-search",
  });
  const categories = useMemo(
    () =>
      [...searchedCategories]
        .filter(
          (category) =>
            categoryStatus === "all" ||
            (categoryStatus === "archived"
              ? Boolean(category.archived_at)
              : !category.archived_at),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categoryStatus, searchedCategories],
  );

  async function request(method: "POST" | "PATCH", body: object) {
    const response = await fetch("/api/categories", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as {
      error?: string;
      category?: Category;
    };
    if (!response.ok)
      throw new Error(result.error ?? "The category could not be updated.");
    return result;
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim();
    const nextDescription = description.trim();
    if (!nextName || !nextDescription) {
      toast.error("Add a category name and description.");
      return;
    }
    setCreating(true);
    try {
      let category: Category = {
        id: crypto.randomUUID(),
        name: nextName,
        description: nextDescription,
        color,
        links,
        created_by: data.currentProfile.id,
        archived_at: null,
      };
      if (!demoMode)
        category = (
          await request("POST", {
            name: nextName,
            description: nextDescription,
            color,
            links,
          })
        ).category!;
      if (!demoMode && attachments.length > 0) {
        let failedAttachments = 0;
        for (const attachment of attachments) {
          try {
            const body = attachment.file
              ? (() => {
                  const formData = new FormData();
                  formData.set("categoryId", category.id);
                  formData.set("file", attachment.file);
                  return formData;
                })()
              : JSON.stringify({
                  categoryId: category.id,
                  name: attachment.name,
                  body: attachment.body,
                });
            const response = await fetch("/api/category-attachments", {
              method: "POST",
              headers: attachment.file
                ? undefined
                : { "Content-Type": "application/json" },
              body,
            });
            if (!response.ok) failedAttachments += 1;
          } catch {
            failedAttachments += 1;
          }
        }
        if (failedAttachments > 0)
          toast.error(
            `${failedAttachments} ${failedAttachments === 1 ? "attachment" : "attachments"} could not be added. You can retry from Edit category.`,
          );
      }
      setData((current) => ({
        ...current,
        categories: [...current.categories, category],
      }));
      setName("");
      setDescription("");
      setLinks([]);
      setAttachments([]);
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
    setEditingLinks(category.links ?? []);
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
          links: editingLinks,
        });
      const updatedCategory: Category = {
        ...category,
        name: nextName,
        description: nextDescription,
        color: editingColor,
        links: editingLinks,
      };
      setData((current) => ({
        ...current,
        categories: current.categories.map((item) =>
          item.id === category.id ? updatedCategory : item,
        ),
      }));
      onCategoryUpdated?.(updatedCategory);
      setEditingId(null);
      if (editCategoryId) setOpen(false);
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

  async function toggleArchived(category: Category) {
    const archived = !category.archived_at;
    try {
      if (!demoMode)
        await request("PATCH", {
          id: category.id,
          name: category.name,
          description: category.description,
          color: category.color,
          links: category.links,
          archived,
        });
      setData((current) => ({
        ...current,
        categories: current.categories.map((item) =>
          item.id === category.id
            ? {
                ...item,
                archived_at: archived ? new Date().toISOString() : null,
              }
            : item,
        ),
      }));
      toast.success(`${category.name} ${archived ? "archived" : "restored"}.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The category could not be updated.",
      );
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
        open={open && !editingId}
        setIsOpen={setOpen}
        title={createOnly ? "New Category" : "Categories"}
        description={
          embedded
            ? "Categories make work easier to scan and filter across projects."
            : undefined
        }
        actions={
          embedded && onCreate && !readOnly ? (
            <Button
              type="button"
              variant="action"
              size="sm"
              leftIcon={<FiPlus aria-hidden />}
              onClick={onCreate}
            >
              New Category
            </Button>
          ) : undefined
        }
        hideActions
        size={createOnly ? "lg" : "xl"}
        embedded={embedded}
        maxHeight="min(42rem, calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom))))"
        footer={
          embedded ? undefined : createOnly ? (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-category-form"
                variant="action"
                size="sm"
                loading={creating}
                loadingText="Creating..."
              >
                Create category
              </Button>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={addCategory}>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  label="Category name"
                  name="category-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Marketing"
                  disabled={creating}
                  required
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
                required
              />
              <LinksFields
                links={links}
                setLinks={setLinks}
                disabled={creating}
                namePrefix="category"
              />
              <ProjectAttachments
                resourceKind="category"
                demoMode={demoMode}
                disabled={creating}
                currentUserId={data.currentProfile.id}
                drafts={attachments}
                onDraftsChange={setAttachments}
              />
              <div className="flex justify-end gap-2 border-t border-black/10 pt-4 dark:border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="action"
                  size="sm"
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
          <form
            id="create-category-form"
            className="space-y-4"
            onSubmit={addCategory}
          >
            <p className="text-sm text-black/60 dark:text-white/60">
              Give related work a recognizable label and color. You can edit or
              archive it from the Categories page later.
            </p>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                label="Category name"
                name="category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Marketing"
                disabled={creating}
                required
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
              required
            />
            <LinksFields
              links={links}
              setLinks={setLinks}
              disabled={creating}
              namePrefix="category"
            />
            <ProjectAttachments
              resourceKind="category"
              demoMode={demoMode}
              disabled={creating}
              currentUserId={data.currentProfile.id}
              drafts={attachments}
              onDraftsChange={setAttachments}
            />
          </form>
        ) : (
          <>
            {!embedded && (
              <p className="mb-5 text-sm text-black/60 dark:text-white/60">
                Categories make work easier to scan and filter across projects.
              </p>
            )}
            <div className="sticky top-0 z-20 -mx-1 mb-4 grid gap-3 bg-white px-1 pb-3 dark:bg-[#181818] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="relative">
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
              <div
                className="flex flex-wrap gap-2"
                aria-label="Filter categories"
              >
                {(["active", "archived", "all"] as const).map((status) => (
                  <FilterChip
                    key={status}
                    active={categoryStatus === status}
                    onClick={() => setCategoryStatus(status)}
                    className="h-10 px-4 py-0"
                  >
                    {status}
                  </FilterChip>
                ))}
              </div>
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
                  <ManagementCard
                    key={category.id}
                    footer={
                      embedded ? (
                        <Button.Link
                          href={withAccessPreview(
                            `/board?category=${encodeURIComponent(category.id)}`,
                            data.accessPreview,
                          )}
                          variant="secondary"
                          size="sm"
                          rightIcon={<FiArrowRight aria-hidden />}
                        >
                          Open board
                        </Button.Link>
                      ) : undefined
                    }
                  >
                    <span
                      aria-hidden
                      className="mt-1 h-4 w-4 shrink-0 rounded-full ring-4 ring-black/5 dark:ring-white/5"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="min-w-0 flex-1 py-1">
                      <span
                        className={`block truncate font-semibold ${category.archived_at ? "text-black/45 line-through dark:text-white/45" : ""}`}
                      >
                        {category.name}
                      </span>
                      {category.description && (
                        <span className="mt-0.5 block line-clamp-2 text-xs text-black/60 dark:text-white/60">
                          {category.description}
                        </span>
                      )}
                      {(category.links ?? []).length > 0 && (
                        <ProjectLinks
                          links={category.links}
                          className={`mt-2 ${embedded ? "mb-4" : ""}`}
                        />
                      )}
                    </div>
                    {category.archived_at && (
                      <span className="mt-1 hidden text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45 sm:inline">
                        Archived
                      </span>
                    )}
                    <IconButton
                      label={`Edit ${category.name}`}
                      onClick={() => beginEdit(category)}
                    >
                      <FiEdit2 />
                    </IconButton>
                    <IconButton
                      label={`${category.archived_at ? "Restore" : "Archive"} ${category.name}`}
                      onClick={() => void toggleArchived(category)}
                    >
                      {category.archived_at ? <FiRotateCcw /> : <FiArchive />}
                    </IconButton>
                  </ManagementCard>
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
          const categoryChanged =
            editingName.trim() !== category.name ||
            editingDescription.trim() !== (category.description ?? "") ||
            editingColor !== category.color ||
            JSON.stringify(editingLinks) !==
              JSON.stringify(category.links ?? []);
          return (
            <Modal
              open
              setIsOpen={(nextOpen) => {
                if (!nextOpen && !saving) {
                  setEditingId(null);
                  if (editCategoryId) setOpen(false);
                }
              }}
              title={`Edit ${category.name}`}
              size="lg"
              hideActions
              maxHeight="min(42rem, calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom))))"
              footer={
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditingId(null);
                      if (editCategoryId) setOpen(false);
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Tooltip
                    content="Make a change before saving."
                    disabled={categoryChanged}
                  >
                    <span tabIndex={categoryChanged ? -1 : 0}>
                      <Button
                        type="submit"
                        form={`edit-category-form-${category.id}`}
                        disabled={!categoryChanged}
                        loading={saving}
                        loadingText="Saving..."
                      >
                        Save changes
                      </Button>
                    </span>
                  </Tooltip>
                </div>
              }
            >
              <form
                id={`edit-category-form-${category.id}`}
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
                <LinksFields
                  links={editingLinks}
                  setLinks={setEditingLinks}
                  disabled={saving}
                  namePrefix={`category-${category.id}`}
                />
                <ProjectAttachments
                  resourceKind="category"
                  categoryId={category.id}
                  demoMode={demoMode}
                  disabled={saving}
                  currentUserId={data.currentProfile.id}
                />
              </form>
            </Modal>
          );
        })()}
    </>
  );
}
