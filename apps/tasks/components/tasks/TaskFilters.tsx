import { DropdownSelect, FilterPanel } from "@ryanmeetup/ui";
import type { Category, Priority, Profile, Project, Status } from "@/lib/types";
import { prioritizeCurrentProfile } from "@/lib/profile-order";
import { filterPanelsExpandedPreferenceKey } from "@/lib/user-preferences";
import { CategoryFilterMenu } from "./CategoryFilterMenu";
import { InclusionFilterMenu } from "./InclusionFilterMenu";

const priorities: Priority[] = ["low", "medium", "high", "urgent"];
const profileName = (profile: Profile) => profile.full_name || "Teammate";

export function TaskFilters({
  categories,
  clearFilters,
  currentProfileId,
  filterCount,
  excludedCategoryIds,
  filterSelections,
  includedCategoryIds,
  onExcludedCategoriesChange,
  onFilterSelectionChange,
  onIncludedCategoriesChange,
  onVisibilityChange,
  profiles,
  projects,
  statuses,
  visibility,
}: {
  categories: Category[];
  clearFilters: () => void;
  currentProfileId: string;
  filterCount: number;
  excludedCategoryIds: string[];
  filterSelections: Record<string, { included: string[]; excluded: string[] }>;
  includedCategoryIds: string[];
  onExcludedCategoriesChange: (value: string[]) => void;
  onFilterSelectionChange: (
    filter: string,
    kind: "included" | "excluded",
    values: string[],
  ) => void;
  onIncludedCategoriesChange: (value: string[]) => void;
  onVisibilityChange: (value: string) => void;
  profiles: Profile[];
  projects: Project[];
  statuses: Status[];
  visibility: string;
}) {
  const orderedProfiles = prioritizeCurrentProfile(profiles, currentProfileId);

  return (
    <FilterPanel
      count={filterCount}
      className="mb-6"
      controlsClassName="grid grid-cols-1 overflow-visible min-[360px]:grid-cols-2 [&>button]:min-w-0 [&>button]:w-full [&>button>span]:truncate [&>div]:min-w-0 [&>div>button]:min-w-0 [&>div>button]:w-full [&>div>button>span]:truncate lg:flex lg:overflow-x-auto lg:[&>button]:w-auto lg:[&>div>button]:w-auto"
      defaultExpanded
      onClear={clearFilters}
      preferenceStorageKey={filterPanelsExpandedPreferenceKey}
    >
      <DropdownSelect
        label="Visibility"
        active={visibility === "archived"}
        value={visibility === "archived" ? "Archived tasks" : "Active tasks"}
        onChange={onVisibilityChange}
        options={[
          { label: "Active tasks", value: "active" },
          { label: "Archived tasks", value: "archived" },
        ]}
      />
      <InclusionFilterMenu
        label="Assignee"
        anyLabel="Anyone"
        options={[
          { label: "Unassigned", value: "unassigned" },
          ...orderedProfiles.map((profile) => ({
            avatar: {
              name: profileName(profile),
              src: profile.avatar_url,
            },
            label: profileName(profile),
            value: profile.id,
          })),
        ]}
        includedValues={filterSelections.assignee.included}
        excludedValues={filterSelections.assignee.excluded}
        onIncludedChange={(values) =>
          onFilterSelectionChange("assignee", "included", values)
        }
        onExcludedChange={(values) =>
          onFilterSelectionChange("assignee", "excluded", values)
        }
      />
      <CategoryFilterMenu
        categories={categories}
        includedIds={includedCategoryIds}
        excludedIds={excludedCategoryIds}
        onIncludedChange={onIncludedCategoriesChange}
        onExcludedChange={onExcludedCategoriesChange}
      />
      <InclusionFilterMenu
        label="Reported by"
        anyLabel="Anyone"
        options={orderedProfiles.map((profile) => ({
          avatar: {
            name: profileName(profile),
            src: profile.avatar_url,
          },
          label: profileName(profile),
          value: profile.id,
        }))}
        includedValues={filterSelections.reporter.included}
        excludedValues={filterSelections.reporter.excluded}
        onIncludedChange={(values) =>
          onFilterSelectionChange("reporter", "included", values)
        }
        onExcludedChange={(values) =>
          onFilterSelectionChange("reporter", "excluded", values)
        }
      />
      <InclusionFilterMenu
        label="Project"
        anyLabel="All projects"
        options={[
          { label: "No project", value: "none" },
          ...projects.map((item) => ({
            label: `${item.name}${item.archived_at ? " (archived)" : ""}`,
            value: item.id,
          })),
        ]}
        includedValues={filterSelections.project.included}
        excludedValues={filterSelections.project.excluded}
        onIncludedChange={(values) =>
          onFilterSelectionChange("project", "included", values)
        }
        onExcludedChange={(values) =>
          onFilterSelectionChange("project", "excluded", values)
        }
      />
      <InclusionFilterMenu
        label="Status"
        anyLabel="All statuses"
        options={statuses.map((item) => ({ label: item.name, value: item.id }))}
        includedValues={filterSelections.status.included}
        excludedValues={filterSelections.status.excluded}
        onIncludedChange={(values) =>
          onFilterSelectionChange("status", "included", values)
        }
        onExcludedChange={(values) =>
          onFilterSelectionChange("status", "excluded", values)
        }
      />
      <InclusionFilterMenu
        label="Priority"
        anyLabel="All priorities"
        options={priorities.map((item) => ({
          label: item[0].toUpperCase() + item.slice(1),
          value: item,
        }))}
        includedValues={filterSelections.priority.included}
        excludedValues={filterSelections.priority.excluded}
        onIncludedChange={(values) =>
          onFilterSelectionChange("priority", "included", values)
        }
        onExcludedChange={(values) =>
          onFilterSelectionChange("priority", "excluded", values)
        }
      />
      <InclusionFilterMenu
        label="Due within"
        anyLabel="Any time"
        options={[
          { label: "Next 7 days", value: "7" },
          { label: "Next 14 days", value: "14" },
          { label: "Next 30 days", value: "30" },
        ]}
        includedValues={filterSelections.dueWithin.included}
        excludedValues={filterSelections.dueWithin.excluded}
        onIncludedChange={(values) =>
          onFilterSelectionChange("dueWithin", "included", values)
        }
        onExcludedChange={(values) =>
          onFilterSelectionChange("dueWithin", "excluded", values)
        }
      />
    </FilterPanel>
  );
}
