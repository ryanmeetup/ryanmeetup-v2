import { DropdownSelect, FilterPanel } from "@ryanmeetup/ui";
import type { Category, Priority, Profile, Project, Status } from "@/lib/types";
import { filterPanelsExpandedPreferenceKey } from "@/lib/user-preferences";
import { CategoryFilterMenu } from "./CategoryFilterMenu";
import { InclusionFilterMenu } from "./InclusionFilterMenu";
import { profileDisplayName } from "@/lib/presentation";

const priorities: Priority[] = ["low", "medium", "high", "urgent"];

export type TaskFilterKey =
  | "assignee"
  | "reporter"
  | "project"
  | "status"
  | "priority"
  | "dueWithin";

type InclusionSelection = { included: string[]; excluded: string[] };

export type TaskFilterOptions = {
  categories: Category[];
  currentProfileId: string;
  profiles: Profile[];
  projects: Project[];
  statuses: Status[];
};

export type TaskFilterController = {
  count: number;
  visibility: string;
  categories: InclusionSelection;
  selections: Record<TaskFilterKey, InclusionSelection>;
  clear: () => void;
  setVisibility: (value: string) => void;
  setCategories: (kind: "included" | "excluded", values: string[]) => void;
  setSelection: (
    filter: TaskFilterKey,
    kind: "included" | "excluded",
    values: string[],
  ) => void;
};

export function TaskFilters({
  options,
  controller,
}: {
  options: TaskFilterOptions;
  controller: TaskFilterController;
}) {
  const { categories, currentProfileId, profiles, projects, statuses } =
    options;
  const {
    count,
    visibility,
    categories: categorySelection,
    selections,
    clear,
    setVisibility,
    setCategories,
    setSelection,
  } = controller;

  return (
    <FilterPanel
      count={count}
      className="mb-6"
      controlsClassName="grid grid-cols-1 overflow-visible min-[360px]:grid-cols-2 [&>button]:min-w-0 [&>button]:w-full [&>button>span]:truncate [&>div]:min-w-0 [&>div>button]:min-w-0 [&>div>button]:w-full [&>div>button>span]:truncate lg:flex lg:overflow-x-auto lg:[&>button]:w-auto lg:[&>div>button]:w-auto"
      defaultExpanded
      onClear={clear}
      preferenceStorageKey={filterPanelsExpandedPreferenceKey}
    >
      <DropdownSelect
        label="Visibility"
        active={visibility === "archived"}
        value={visibility === "archived" ? "Archived tasks" : "Active tasks"}
        onChange={setVisibility}
        options={[
          { label: "Active tasks", value: "active" },
          { label: "Archived tasks", value: "archived" },
        ]}
      />
      <InclusionFilterMenu
        label="Assignee"
        proximityValue={currentProfileId}
        anyLabel="Anyone"
        options={[
          { label: "Unassigned", value: "unassigned" },
          ...profiles.map((profile) => ({
            avatar: {
              name: profileDisplayName(profile),
              src: profile.avatar_url,
            },
            label: profileDisplayName(profile),
            value: profile.id,
          })),
        ]}
        includedValues={selections.assignee.included}
        excludedValues={selections.assignee.excluded}
        onIncludedChange={(values) =>
          setSelection("assignee", "included", values)
        }
        onExcludedChange={(values) =>
          setSelection("assignee", "excluded", values)
        }
      />
      <CategoryFilterMenu
        categories={categories}
        includedIds={categorySelection.included}
        excludedIds={categorySelection.excluded}
        onIncludedChange={(values) => setCategories("included", values)}
        onExcludedChange={(values) => setCategories("excluded", values)}
      />
      <InclusionFilterMenu
        label="Reported by"
        proximityValue={currentProfileId}
        anyLabel="Anyone"
        options={profiles.map((profile) => ({
          avatar: {
            name: profileDisplayName(profile),
            src: profile.avatar_url,
          },
          label: profileDisplayName(profile),
          value: profile.id,
        }))}
        includedValues={selections.reporter.included}
        excludedValues={selections.reporter.excluded}
        onIncludedChange={(values) =>
          setSelection("reporter", "included", values)
        }
        onExcludedChange={(values) =>
          setSelection("reporter", "excluded", values)
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
        includedValues={selections.project.included}
        excludedValues={selections.project.excluded}
        onIncludedChange={(values) =>
          setSelection("project", "included", values)
        }
        onExcludedChange={(values) =>
          setSelection("project", "excluded", values)
        }
      />
      <InclusionFilterMenu
        label="Status"
        anyLabel="All statuses"
        options={statuses.map((item) => ({ label: item.name, value: item.id }))}
        includedValues={selections.status.included}
        excludedValues={selections.status.excluded}
        onIncludedChange={(values) =>
          setSelection("status", "included", values)
        }
        onExcludedChange={(values) =>
          setSelection("status", "excluded", values)
        }
      />
      <InclusionFilterMenu
        label="Priority"
        anyLabel="All priorities"
        options={priorities.map((item) => ({
          label: item[0].toUpperCase() + item.slice(1),
          value: item,
        }))}
        includedValues={selections.priority.included}
        excludedValues={selections.priority.excluded}
        onIncludedChange={(values) =>
          setSelection("priority", "included", values)
        }
        onExcludedChange={(values) =>
          setSelection("priority", "excluded", values)
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
        includedValues={selections.dueWithin.included}
        excludedValues={selections.dueWithin.excluded}
        onIncludedChange={(values) =>
          setSelection("dueWithin", "included", values)
        }
        onExcludedChange={(values) =>
          setSelection("dueWithin", "excluded", values)
        }
      />
    </FilterPanel>
  );
}
