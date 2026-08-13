"use client";

import {
  useMemo,
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  Button,
  Avatar,
  ConfirmationDialog,
  DropdownSelect,
  FilterChip,
  IconButton,
  Input,
  Modal,
  MultiSelect,
  TagInput,
  Textarea,
  Tooltip,
  toast,
} from "@ryanmeetup/ui";
import { useQueryParamState, useSearchFilter } from "@ryanmeetup/hooks";
import {
  FiArchive,
  FiArrowRight,
  FiEdit2,
  FiLoader,
  FiPlus,
  FiRefreshCw,
  FiRotateCcw,
  FiSearch,
  FiTag,
  FiUsers,
} from "react-icons/fi";
import { withAccessPreview } from "@/lib/access-preview";
import {
  CountBadge,
  ManagementCard,
  ManagementCardTitle,
  ResourceOwnerSelect,
} from "@/components/global";
import type {
  Category,
  ProjectLink,
} from "@/lib/resource-types";
import type { WorkspaceData } from "@/lib/workspace-types";
import {
  ExpandableResourceEditor,
  ResourceFields,
  useResourceModalState,
  useResourceMutations,
  ResourceAttachments,
  ResourceLinks,
  ResourceLinksFields,
} from "@/components/resources";
import { mutate } from "@/lib/mutation-client";
import {
  archiveFilter,
  filterAndSortResources,
  resourceSearchText,
  sameIds,
} from "@/lib/resource-management";

type CategoryAccessGroup = {
  id: string;
  name: string;
  kind: "tier" | "team";
  hierarchy_rank: number | null;
  grants_global_content: boolean;
};

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
  modal: {
    open: boolean;
    setOpen: (value: boolean) => void;
  };
  workspace: {
    data: WorkspaceData;
    setData: Dispatch<SetStateAction<WorkspaceData>>;
    demoMode: boolean;
  };
  options?: {
    embedded?: boolean;
    createOnly?: boolean;
    editCategoryId?: string | null;
    readOnly?: boolean;
  };
  events?: {
    onCreate?: () => void;
    onCategoryUpdated?: (category: Category) => void;
  };
};

export function CategoriesModal({
  modal,
  workspace,
  options,
  events,
}: CategoriesModalProps) {
  const { open, setOpen } = modal;
  const { data, setData, demoMode } = workspace;
  const {
    embedded = false,
    createOnly = false,
    editCategoryId = null,
    readOnly = false,
  } = options ?? {};
  const { onCreate, onCategoryUpdated } = events ?? {};
  const resourceMutations = useResourceMutations("category");
  const directEditCategory = editCategoryId
    ? (data.categories.find((category) => category.id === editCategoryId) ??
      null)
    : null;
  const createState = useResourceModalState(data.currentProfile.id);
  const { name, description, links, attachments, ownerIds: newOwnerIds } = createState.draft;
  const { setName, setDescription, setLinks, setAttachments, setOwnerIds: setNewOwnerIds } = createState.changes;
  const { creating, setCreating, detailsOpen: createDetailsOpen, setDetailsOpen: setCreateDetailsOpen } = createState;
  const [color, setColor] = useState(() => randomCategoryColor());
  const [tags, setTags] = useState<string[]>([]);
  const [newAccessMode, setNewAccessMode] =
    useState<Category["access_mode"]>("open");
  const [newAccessGroupIds, setNewAccessGroupIds] = useState<string[]>([]);
  const [confirmSuiteOnlyCreate, setConfirmSuiteOnlyCreate] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [categoryStatusParam, setCategoryStatus] = useQueryParamState(
    "category-status",
    "active",
  );
  const categoryStatus = archiveFilter(categoryStatusParam);
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
  const [editingTags, setEditingTags] = useState<string[]>(
    directEditCategory?.tags ?? [],
  );
  const [editingAccessMode, setEditingAccessMode] = useState<
    Category["access_mode"]
  >(directEditCategory?.access_mode ?? "open");
  const [accessGroups, setAccessGroups] = useState<CategoryAccessGroup[]>([]);
  const [editingAccessGroupIds, setEditingAccessGroupIds] = useState<string[]>(
    [],
  );
  const [savedAccessGroupIds, setSavedAccessGroupIds] = useState<string[]>([]);
  const [accessLoaded, setAccessLoaded] = useState(demoMode);
  const [confirmSuiteOnlyCategory, setConfirmSuiteOnlyCategory] =
    useState<Category | null>(null);
  const [editingOwnerIds, setEditingOwnerIds] = useState<string[]>(
    directEditCategory
      ? data.categoryOwners
          .filter((item) => item.category_id === directEditCategory.id)
          .map((item) => item.profile_id)
      : [],
  );
  const [saving, setSaving] = useState(false);
  const {
    query,
    setQuery,
    filtered: searchedCategories,
    isPending: searchPending,
  } = useSearchFilter({
    data: data.categories,
    buildHaystack: resourceSearchText,
    queryParam: "category-search",
  });
  const categories = useMemo(
    () => filterAndSortResources(searchedCategories, categoryStatus),
    [categoryStatus, searchedCategories],
  );

  async function addCategory(
    event?: FormEvent<HTMLFormElement>,
    suiteOnlyConfirmed = false,
  ) {
    event?.preventDefault();
    const nextName = name.trim();
    const nextDescription = description.trim();
    const nextTags = tags;
    if (!nextName || !nextDescription || newOwnerIds.length === 0) {
      toast.error("Add a category name, description, and at least one owner.");
      return;
    }
    if (
      data.currentProfile.app_role === "owner" &&
      newAccessMode === "restricted" &&
      newAccessGroupIds.length === 0 &&
      !suiteOnlyConfirmed
    ) {
      setConfirmSuiteOnlyCreate(true);
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
        tags: nextTags,
        created_by: data.currentProfile.id,
        archived_at: null,
        access_mode: newAccessMode,
      };
      if (!demoMode)
        category = (
          await resourceMutations.save("POST", {
            name: nextName,
            description: nextDescription,
            color,
            links,
            tags: nextTags,
            ownerIds: newOwnerIds,
            ...(data.currentProfile.app_role === "owner"
              ? {
                  accessMode: newAccessMode,
                  accessGroupIds:
                    newAccessMode === "restricted"
                      ? newAccessGroupIds
                      : [],
                }
              : {}),
          })
        ).category!;
      if (!demoMode && attachments.length > 0) {
        const failedAttachments = await resourceMutations.uploadDrafts(attachments, category.id);
        if (failedAttachments > 0)
          toast.error(
            `${failedAttachments} ${failedAttachments === 1 ? "attachment" : "attachments"} could not be added. You can retry from Edit category.`,
          );
      }
      setData((current) => ({
        ...current,
        categories: [...current.categories, category],
        categoryOwners: [
          ...current.categoryOwners,
          ...newOwnerIds.map((profile_id) => ({
            category_id: category.id,
            profile_id,
          })),
        ],
      }));
      createState.reset();
      setTags([]);
      setNewAccessMode("open");
      setNewAccessGroupIds([]);
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

  async function loadCategoryAccess(categoryId?: string) {
    if (demoMode || data.currentProfile.app_role !== "owner") return;
    try {
      const result = await mutate<{
        groups: CategoryAccessGroup[];
        groupIds: string[];
      }>(
        categoryId
          ? `/api/category-access?categoryId=${encodeURIComponent(categoryId)}`
          : "/api/category-access",
        { method: "GET" },
      );
      setAccessGroups(result.groups);
      setEditingAccessGroupIds(result.groupIds);
      setSavedAccessGroupIds(result.groupIds);
      setAccessLoaded(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Category access settings could not be loaded.",
      );
    }
  }

  useEffect(() => {
    // Direct-edit modals receive owner-only access metadata from the API after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (directEditCategory) void loadCategoryAccess(directEditCategory.id);
    else if (createOnly && data.currentProfile.app_role === "owner")
      void loadCategoryAccess();
    // This modal's direct-edit target is fixed while it is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOnly, directEditCategory?.id]);

  function beginEdit(category: Category) {
    setEditDetailsOpen(false);
    setEditingId(category.id);
    setEditingName(category.name);
    setEditingDescription(category.description ?? "");
    setEditingColor(category.color);
    setEditingLinks(category.links ?? []);
    setEditingTags(category.tags);
    setEditingAccessMode(category.access_mode);
    setEditingAccessGroupIds([]);
    setSavedAccessGroupIds([]);
    setAccessLoaded(demoMode);
    void loadCategoryAccess(category.id);
    setEditingOwnerIds(
      data.categoryOwners
        .filter((item) => item.category_id === category.id)
        .map((item) => item.profile_id),
    );
  }

  async function updateCategory(
    category: Category,
    suiteOnlyConfirmed = false,
  ) {
    const nextName = editingName.trim();
    if (!nextName || editingOwnerIds.length === 0) {
      toast.error("Add a category name and at least one owner.");
      return;
    }
    const nextDescription = editingDescription.trim() || null;
    const nextTags = editingTags;
    const currentOwnerIds = data.categoryOwners
      .filter((item) => item.category_id === category.id)
      .map((item) => item.profile_id);
    const ownersChanged = !sameIds(currentOwnerIds, editingOwnerIds);
    if (
      data.currentProfile.app_role === "owner" &&
      editingAccessMode === "restricted" &&
      editingAccessGroupIds.length === 0 &&
      !suiteOnlyConfirmed
    ) {
      setConfirmSuiteOnlyCategory(category);
      return;
    }
    setSaving(true);
    try {
      if (!demoMode)
        await resourceMutations.save("PATCH", {
          id: category.id,
          name: nextName,
          description: nextDescription,
          color: editingColor,
          links: editingLinks,
          tags: nextTags,
          ...(ownersChanged ? { ownerIds: editingOwnerIds } : {}),
        });
      if (!demoMode && data.currentProfile.app_role === "owner") {
        await mutate("/api/category-access", {
          method: "POST",
          body: JSON.stringify({
            categoryId: category.id,
            accessMode: editingAccessMode,
            groupIds:
              editingAccessMode === "restricted"
                ? editingAccessGroupIds
                : [],
          }),
        });
      }
      const updatedCategory: Category = {
        ...category,
        name: nextName,
        description: nextDescription,
        color: editingColor,
        links: editingLinks,
        tags: nextTags,
        access_mode: editingAccessMode,
      };
      setData((current) => ({
        ...current,
        categories: current.categories.map((item) =>
          item.id === category.id ? updatedCategory : item,
        ),
        categoryOwners: ownersChanged
          ? [
              ...current.categoryOwners.filter(
                (item) => item.category_id !== category.id,
              ),
              ...editingOwnerIds.map((profile_id) => ({
                category_id: category.id,
                profile_id,
              })),
            ]
          : current.categoryOwners,
      }));
      setSavedAccessGroupIds(editingAccessGroupIds);
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
        await resourceMutations.save("PATCH", {
          id: category.id,
          name: category.name,
          description: category.description,
          color: category.color,
          links: category.links,
          tags: category.tags,
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
        <span>
          Color <span className="text-red-500">*</span>
        </span>
        <input
          type="color"
          className="color-input !h-10 !w-10"
          value={currentColor}
          onChange={(event) => setCurrentColor(event.target.value)}
          disabled={disabled}
          required
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

  const ownerControl = (
    value: string[],
    onChange: (value: string[]) => void,
    disabled: boolean,
  ) => (
    <ResourceOwnerSelect
      label="Category owners"
      profiles={data.profiles}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );

  const newCategoryAccessControl = (
    <>
        <DropdownSelect
          label="Category access"
          required
          variant="field"
          value={newAccessMode}
          onChange={(value) =>
            setNewAccessMode(value as Category["access_mode"])
          }
          options={[
            { label: "Open to all members", value: "open" },
            {
              label: "Restricted to selected access groups",
              value: "restricted",
            },
          ]}
          disabled={
            creating ||
            data.currentProfile.app_role !== "owner" ||
            !accessLoaded
          }
        />
        {data.currentProfile.app_role !== "owner" && (
          <p className="mt-2 text-sm text-black/70 dark:text-white/70">
            New categories are open by default. App owners manage category
            access.
          </p>
        )}
        {data.currentProfile.app_role === "owner" &&
          newAccessMode === "restricted" && (
          <div className="mt-4">
            <MultiSelect
              label="Allowed access groups"
              options={accessGroups.map((group) => ({
                label: group.name,
                value: group.id,
              }))}
              value={newAccessGroupIds}
              onChange={setNewAccessGroupIds}
              placeholder={
                accessLoaded
                  ? "R Suite and owners only"
                  : "Loading access groups…"
              }
              searchable
              searchPlaceholder="Search access groups"
              disabled={creating || !accessLoaded}
            />
            <p className="mt-2 text-sm text-black/70 dark:text-white/70">
              R Suite and owners always retain access. Select any additional
              groups that should see this category.
            </p>
          </div>
          )}
    </>
  );

  const newCategoryPrimaryFields = (
    <ResourceFields section="primary" resource={{ kind: "category" }} values={{ name, description, ownerIds: newOwnerIds, links, attachments }} changes={{ setName, setDescription, setOwnerIds: setNewOwnerIds, setLinks, setAttachments }} editor={{ disabled: creating, demoMode, currentUserId: data.currentProfile.id, profiles: data.profiles }} copy={{ nameLabel: "Category name", namePlaceholder: "Marketing", descriptionPlaceholder: "What kind of work belongs in this category?" }} primarySlot={<>
      {colorControl(color, setColor, creating)}
      <TagInput
        label="Tags"
        value={tags}
        onChange={setTags}
        placeholder="Feature"
        disabled={creating}
      />
      {newCategoryAccessControl}
    </>} />
  );
  const newCategorySecondaryFields = (
    <ResourceFields section="supporting" resource={{ kind: "category" }} values={{ name, description, ownerIds: newOwnerIds, links, attachments }} changes={{ setName, setDescription, setOwnerIds: setNewOwnerIds, setLinks, setAttachments }} editor={{ disabled: creating, demoMode, currentUserId: data.currentProfile.id, profiles: data.profiles }} copy={{ nameLabel: "Category name", namePlaceholder: "Marketing", descriptionPlaceholder: "What kind of work belongs in this category?" }} />
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
              size="sm"
              className="w-full sm:w-auto"
              leftIcon={<FiPlus aria-hidden />}
              onClick={onCreate}
            >
              New Category
            </Button>
          ) : undefined
        }
        hideActions
        size={createOnly && createDetailsOpen ? "2xl" : createOnly ? "lg" : "xl"}
        panelClassName={
          createOnly
            ? "transition-[max-width] duration-300 ease-out motion-reduce:transition-none"
            : undefined
        }
        embedded={embedded}
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
              <ExpandableResourceEditor
                expanded={createDetailsOpen}
                setExpanded={setCreateDetailsOpen}
                primary={newCategoryPrimaryFields}
                secondary={newCategorySecondaryFields}
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
            <ExpandableResourceEditor
              expanded={createDetailsOpen}
              setExpanded={setCreateDetailsOpen}
              primary={newCategoryPrimaryFields}
              secondary={newCategorySecondaryFields}
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
                className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap"
                aria-label="Filter categories"
              >
                {(["active", "archived", "all"] as const).map((status) => (
                  <FilterChip
                    key={status}
                    active={categoryStatus === status}
                    onClick={() => setCategoryStatus(status)}
                    className="h-10 w-full justify-center px-2 py-0 sm:w-auto sm:px-4"
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
                className={`${searchPending ? "pointer-events-none opacity-55" : ""} grid auto-rows-fr items-stretch gap-4 transition-opacity md:grid-cols-2 ${embedded ? "lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3" : ""}`}
              >
                {categories.map((category) => {
                  const taskCount = data.taskCategories.filter(
                    (item) => item.category_id === category.id,
                  ).length;
                  const owners = data.categoryOwners
                    .filter((item) => item.category_id === category.id)
                    .flatMap((item) => {
                      const profile = data.profiles.find(
                        (candidate) => candidate.id === item.profile_id,
                      );
                      return profile ? [profile] : [];
                    });
                  return (
                    <ManagementCard
                      key={category.id}
                      body={
                        category.description ||
                        (category.links ?? []).length ||
                        category.tags.length ? (
                          <div className="min-w-0">
                            {category.description && (
                              <p className="text-sm text-black/60 dark:text-white/60">
                                {category.description}
                              </p>
                            )}
                            {(category.links ?? []).length > 0 && (
                              <div className="mt-3">
                                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
                                  Useful links
                                </p>
                                <ResourceLinks links={category.links} />
                              </div>
                            )}
                            {category.tags.length > 0 && (
                              <div className="mb-3 mt-3">
                                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
                                  Available tags
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {category.tags.slice(0, 4).map((tag) => (
                                    <span
                                      key={tag}
                                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold text-black/70 dark:text-white/75"
                                      style={{
                                        borderColor: `${category.color}55`,
                                        backgroundColor: `${category.color}18`,
                                      }}
                                    >
                                      <FiTag
                                        aria-hidden
                                        className="h-2.5 w-2.5"
                                      />
                                      {tag}
                                    </span>
                                  ))}
                                  {category.tags.length > 4 && (
                                    <Tooltip
                                      content={category.tags
                                        .slice(4)
                                        .join(", ")}
                                      placement="top"
                                    >
                                      <span
                                        className="inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-semibold text-black/60 dark:text-white/65"
                                        style={{
                                          borderColor: `${category.color}55`,
                                          backgroundColor: `${category.color}18`,
                                        }}
                                      >
                                        +{category.tags.length - 4}
                                      </span>
                                    </Tooltip>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : undefined
                      }
                      footerClassName="flex-wrap justify-start"
                      footer={
                        <>
                          {owners.length > 0 ? (
                            <div
                              className="flex shrink-0 -space-x-2"
                              aria-label={`${owners.length} ${owners.length === 1 ? "owner" : "owners"}`}
                            >
                              {owners.slice(0, 3).map((owner) => (
                                <Tooltip
                                  key={owner.id}
                                  content={owner.full_name}
                                  placement="top"
                                >
                                  <Avatar
                                    name={owner.full_name}
                                    src={owner.avatar_url}
                                    size="md"
                                    className="ring-2 ring-white dark:ring-[#181818]"
                                  />
                                </Tooltip>
                              ))}
                              {owners.length > 3 && (
                                <Tooltip
                                  content={owners
                                    .slice(3)
                                    .map((owner) => owner.full_name)
                                    .join(", ")}
                                  placement="top"
                                >
                                  <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-white bg-black text-[10px] font-bold text-white dark:border-[#181818] dark:bg-white dark:text-black">
                                    +{owners.length - 3}
                                  </span>
                                </Tooltip>
                              )}
                            </div>
                          ) : (
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-dashed border-black/25 text-black/40 dark:border-white/25 dark:text-white/40">
                              <FiUsers aria-hidden size={14} />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40 dark:text-white/40">
                              Owners
                            </p>
                            <p
                              className="truncate text-xs font-medium text-black/65 dark:text-white/65"
                              title={owners
                                .map((owner) => owner.full_name)
                                .join(", ")}
                            >
                              {owners.length > 0
                                ? `${owners
                                    .slice(0, 3)
                                    .map((owner) => owner.full_name)
                                    .join(
                                      ", ",
                                    )}${owners.length > 3 ? ` +${owners.length - 3}` : ""}`
                                : "Unassigned"}
                            </p>
                          </div>
                          {embedded && (
                            <Button.Link
                              href={withAccessPreview(
                                `/board?category=${encodeURIComponent(category.name)}`,
                                data.accessPreview,
                              )}
                              variant="secondary"
                              size="sm"
                              className="w-full justify-center sm:ml-auto sm:w-auto"
                              rightIcon={<FiArrowRight aria-hidden />}
                            >
                              Open board
                            </Button.Link>
                          )}
                        </>
                      }
                    >
                      <span
                        aria-hidden
                        className="h-4 w-4 shrink-0 rounded-full ring-4 ring-black/5 dark:ring-white/5"
                        style={{ backgroundColor: category.color }}
                      />
                      <div className="min-w-0 flex-1 py-1">
                        <ManagementCardTitle
                          className={
                            category.archived_at
                              ? "text-black/45 line-through dark:text-white/45"
                              : undefined
                          }
                        >
                          <span className="inline-flex max-w-full items-center gap-2">
                            <span className="truncate">{category.name}</span>
                            <Tooltip
                              content={`${taskCount} ${taskCount === 1 ? "task" : "tasks"} in this category`}
                              placement="top"
                            >
                              <CountBadge>{taskCount}</CountBadge>
                            </Tooltip>
                          </span>
                        </ManagementCardTitle>
                      </div>
                      {category.archived_at && (
                        <span className="mt-1 hidden text-[10px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45 sm:inline">
                          Archived
                        </span>
                      )}
                      {!readOnly && (
                        <>
                          <IconButton
                            label={`Edit “${category.name}”`}
                            onClick={() => beginEdit(category)}
                          >
                            <FiEdit2 />
                          </IconButton>
                          <IconButton
                            label={`${category.archived_at ? "Restore" : "Archive"} “${category.name}”`}
                            onClick={() => void toggleArchived(category)}
                          >
                            {category.archived_at ? (
                              <FiRotateCcw />
                            ) : (
                              <FiArchive />
                            )}
                          </IconButton>
                        </>
                      )}
                    </ManagementCard>
                  );
                })}
                {categories.length === 0 && (
                  <div
                    className={`rounded-xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-black/55 dark:border-white/10 dark:text-white/55 md:col-span-2 ${embedded ? "lg:col-span-1 xl:col-span-2 2xl:col-span-3" : ""}`}
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
            JSON.stringify(editingTags) !== JSON.stringify(category.tags) ||
            JSON.stringify(editingLinks) !==
              JSON.stringify(category.links ?? []) ||
            editingAccessMode !== category.access_mode ||
            !sameIds(editingAccessGroupIds, savedAccessGroupIds) ||
            !sameIds(
              editingOwnerIds,
              data.categoryOwners
                .filter((item) => item.category_id === category.id)
                .map((item) => item.profile_id),
            );
          return (
            <Modal
              open
              setIsOpen={(nextOpen) => {
                if (!nextOpen && !saving) {
                  setEditDetailsOpen(false);
                  setEditingId(null);
                  if (editCategoryId) setOpen(false);
                }
              }}
              title={`Edit ${category.name}`}
              size={editDetailsOpen ? "2xl" : "lg"}
              panelClassName="transition-[max-width] duration-300 ease-out motion-reduce:transition-none"
              hideActions
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
                        disabled={
                          !categoryChanged ||
                          (data.currentProfile.app_role === "owner" &&
                            !accessLoaded)
                        }
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
                <ExpandableResourceEditor
                  expanded={editDetailsOpen}
                  setExpanded={setEditDetailsOpen}
                  primary={<>
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
                <TagInput
                  label="Tags"
                  value={editingTags}
                  onChange={setEditingTags}
                  placeholder="Feature"
                  disabled={saving}
                />
                <>
                    <DropdownSelect
                      label="Category access"
                      required
                      variant="field"
                      value={editingAccessMode}
                      onChange={(value) =>
                        setEditingAccessMode(value as Category["access_mode"])
                      }
                      options={[
                        { label: "Open to all members", value: "open" },
                        {
                          label: "Restricted to selected access groups",
                          value: "restricted",
                        },
                      ]}
                      disabled={
                        saving || data.currentProfile.app_role !== "owner"
                      }
                    />
                    <p className="mt-2 text-sm text-black/70 dark:text-white/70">
                      Restricted categories and their work are hidden from
                      everyone except selected access groups and R Suite.
                    </p>
                    {data.currentProfile.app_role === "owner" &&
                      editingAccessMode === "restricted" && (
                      <div className="mt-4">
                        <MultiSelect
                          label="Allowed access groups"
                          options={accessGroups.map((group) => ({
                            label: group.name,
                            value: group.id,
                          }))}
                          value={editingAccessGroupIds}
                          onChange={setEditingAccessGroupIds}
                          placeholder={
                            !accessLoaded
                              ? "Loading access groups…"
                              : "R Suite and owners only"
                          }
                          searchable
                          searchPlaceholder="Search access groups"
                          disabled={saving || !accessLoaded}
                        />
                        <p className="mt-2 text-sm text-black/70 dark:text-white/70">
                          R Suite and owners always retain access. Select any
                          additional groups that should see this category.
                        </p>
                      </div>
                      )}
                </>
                {ownerControl(editingOwnerIds, setEditingOwnerIds, saving)}
                  </>}
                  secondary={<>
                <ResourceLinksFields
                  links={editingLinks}
                  setLinks={setEditingLinks}
                  disabled={saving}
                  namePrefix={`category-${category.id}`}
                />
                <ResourceAttachments
                  resource={{ kind: "category", id: category.id }}
                  editor={{
                    demoMode,
                    disabled: saving,
                    currentUserId: data.currentProfile.id,
                  }}
                />
                  </>}
                />
              </form>
            </Modal>
          );
        })()}
      <ConfirmationDialog
        open={Boolean(confirmSuiteOnlyCategory)}
        setOpen={(nextOpen) => {
          if (!nextOpen) setConfirmSuiteOnlyCategory(null);
        }}
        title="Restrict to R Suite and owners?"
        description="No additional access groups are selected. Everyone below R Suite will lose access to this category and its work."
        confirmLabel="Restrict category"
        onConfirm={() => {
          const category = confirmSuiteOnlyCategory;
          setConfirmSuiteOnlyCategory(null);
          if (category) void updateCategory(category, true);
        }}
      />
      <ConfirmationDialog
        open={confirmSuiteOnlyCreate}
        setOpen={setConfirmSuiteOnlyCreate}
        title="Create for R Suite and owners only?"
        description="No additional access groups are selected. Everyone below R Suite will be unable to see this category or its work."
        confirmLabel="Create restricted category"
        onConfirm={() => {
          setConfirmSuiteOnlyCreate(false);
          void addCategory(undefined, true);
        }}
      />
    </>
  );
}
