import type { Dispatch, SetStateAction } from "react";
import type {
  Category,
  CategoryOwner,
} from "@/lib/resources/resource-types";
import type { TaskCategory } from "@/lib/tasks/task-types";
import type {
  AccessPreview,
  Profile,
  WorkspaceData,
} from "@/lib/workspace/workspace-types";

type CategoryWorkspaceView = {
  categories: Category[];
  categoryOwners: CategoryOwner[];
  taskCategories: TaskCategory[];
  profiles: Profile[];
  currentProfile: Profile;
  accessPreview?: AccessPreview;
};

export type CategoryController = {
  view: CategoryWorkspaceView;
  demoMode: boolean;
  commands: {
    add: (category: Category, ownerIds: string[]) => void;
    update: (category: Category, ownerIds?: string[]) => void;
    setArchived: (categoryId: string, archivedAt: string | null) => void;
    remove: (categoryId: string) => void;
  };
};

/** Adapts the aggregate store to the category editor's domain boundary. */
export function categoryController(
  data: WorkspaceData,
  setData: Dispatch<SetStateAction<WorkspaceData>>,
  demoMode: boolean,
): CategoryController {
  return {
    view: {
      categories: data.categories,
      categoryOwners: data.categoryOwners,
      taskCategories: data.taskCategories,
      profiles: data.profiles,
      currentProfile: data.currentProfile,
      accessPreview: data.accessPreview,
    },
    demoMode,
    commands: {
      add: (category, ownerIds) =>
        setData((current) => ({
          ...current,
          categories: [...current.categories, category],
          categoryOwners: [
            ...current.categoryOwners,
            ...ownerIds.map((profile_id) => ({
              category_id: category.id,
              profile_id,
            })),
          ],
        })),
      update: (category, ownerIds) =>
        setData((current) => ({
          ...current,
          categories: current.categories.map((item) =>
            item.id === category.id ? category : item,
          ),
          categoryOwners: ownerIds
            ? [
                ...current.categoryOwners.filter(
                  (item) => item.category_id !== category.id,
                ),
                ...ownerIds.map((profile_id) => ({
                  category_id: category.id,
                  profile_id,
                })),
              ]
            : current.categoryOwners,
        })),
      setArchived: (categoryId, archivedAt) =>
        setData((current) => ({
          ...current,
          categories: current.categories.map((category) =>
            category.id === categoryId
              ? { ...category, archived_at: archivedAt }
              : category,
          ),
        })),
      remove: (categoryId) =>
        setData((current) => ({
          ...current,
          categories: current.categories.filter(
            (category) => category.id !== categoryId,
          ),
          categoryOwners: current.categoryOwners.filter(
            (owner) => owner.category_id !== categoryId,
          ),
        })),
    },
  };
}
