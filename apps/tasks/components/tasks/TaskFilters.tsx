import { DropdownSelect, FilterPanel } from "@ryanmeetup/ui";
import type { Category, Priority, Profile, Project, Status } from "@/lib/types";
import { filterPanelsExpandedPreferenceKey } from "@/lib/user-preferences";
import { CategoryFilterMenu } from "./CategoryFilterMenu";

const priorities: Priority[] = ["low", "medium", "high", "urgent"];
const profileName = (profile: Profile) => profile.full_name || "Teammate";

export function TaskFilters({
  assignee,
  assigneeActive,
  categories,
  clearFilters,
  filterCount,
  excludedCategoryIds,
  includedCategoryIds,
  dueWithin,
  involved,
  onAssigneeChange,
  onDueWithinChange,
  onExcludedCategoriesChange,
  onIncludedCategoriesChange,
  onInvolvedChange,
  onPriorityChange,
  onProjectChange,
  onReporterChange,
  onStatusChange,
  onVisibilityChange,
  priority,
  profiles,
  reporter,
  project,
  projects,
  selectedAssignee,
  selectedInvolved,
  selectedPriority,
  selectedProject,
  selectedReporter,
  selectedStatus,
  status,
  statuses,
  visibility,
}: {
  assignee: string;
  assigneeActive: boolean;
  categories: Category[];
  clearFilters: () => void;
  filterCount: number;
  excludedCategoryIds: string[];
  includedCategoryIds: string[];
  dueWithin: string;
  involved: string;
  onAssigneeChange: (value: string) => void;
  onDueWithinChange: (value: string) => void;
  onExcludedCategoriesChange: (value: string[]) => void;
  onIncludedCategoriesChange: (value: string[]) => void;
  onInvolvedChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onReporterChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onVisibilityChange: (value: string) => void;
  priority: string;
  profiles: Profile[];
  reporter: string;
  project: string;
  projects: Project[];
  selectedAssignee?: Profile | null;
  selectedInvolved?: Profile | null;
  selectedPriority?: Priority | null;
  selectedProject?: Project | null;
  selectedReporter?: Profile | null;
  selectedStatus?: Status | null;
  status: string;
  statuses: Status[];
  visibility: string;
}) {
  return (
    <FilterPanel
      count={filterCount}
      className="mb-6"
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
      <DropdownSelect
        label="Assignee"
        active={assigneeActive}
        value={
          selectedAssignee
            ? profileName(selectedAssignee)
            : assignee.toLowerCase() === "unassigned"
              ? "Unassigned"
              : assignee
        }
        onChange={onAssigneeChange}
        options={[
          { label: "Anyone", value: "all" },
          { label: "Unassigned", value: "Unassigned" },
          ...profiles.map((profile) => ({
            avatar: {
              name: profileName(profile),
              src: profile.avatar_url,
            },
            label: profileName(profile),
            value: profileName(profile),
          })),
        ]}
      />
      <CategoryFilterMenu
        categories={categories}
        includedIds={includedCategoryIds}
        excludedIds={excludedCategoryIds}
        onIncludedChange={onIncludedCategoriesChange}
        onExcludedChange={onExcludedCategoriesChange}
      />
      <DropdownSelect
        label="Reported by"
        active={reporter !== "all"}
        value={selectedReporter ? profileName(selectedReporter) : reporter}
        onChange={onReporterChange}
        options={[
          { label: "Anyone", value: "all" },
          ...profiles.map((profile) => ({
            avatar: {
              name: profileName(profile),
              src: profile.avatar_url,
            },
            label: profileName(profile),
            value: profileName(profile),
          })),
        ]}
      />
      <DropdownSelect
        label="Project"
        active={project !== "all"}
        value={selectedProject?.name ?? project}
        onChange={onProjectChange}
        options={[
          { label: "All projects", value: "all" },
          { label: "No project", value: "none" },
          ...projects.map((item) => ({
            label: `${item.name}${item.archived_at ? " (archived)" : ""}`,
            value: item.name,
          })),
        ]}
      />
      <DropdownSelect
        label="Status"
        active={status !== "all"}
        value={selectedStatus?.name ?? status}
        onChange={onStatusChange}
        options={[
          { label: "All statuses", value: "all" },
          ...statuses.map((item) => ({ label: item.name, value: item.name })),
        ]}
      />
      <DropdownSelect
        label="Priority"
        active={priority !== "all"}
        value={
          selectedPriority
            ? selectedPriority[0].toUpperCase() + selectedPriority.slice(1)
            : priority
        }
        onChange={onPriorityChange}
        options={[
          { label: "All priorities", value: "all" },
          ...priorities.map((item) => ({
            label: item[0].toUpperCase() + item.slice(1),
            value: item[0].toUpperCase() + item.slice(1),
          })),
        ]}
      />
      <DropdownSelect
        label="Due within"
        active={dueWithin !== "all"}
        value={dueWithin}
        onChange={onDueWithinChange}
        options={[
          { label: "Any time", value: "all" },
          { label: "Next 7 days", value: "7" },
          { label: "Next 14 days", value: "14" },
          { label: "Next 30 days", value: "30" },
        ]}
      />
      <DropdownSelect
        label="Involvement"
        active={involved !== "all"}
        value={selectedInvolved ? profileName(selectedInvolved) : involved}
        onChange={onInvolvedChange}
        options={[
          { label: "Anyone", value: "all" },
          ...profiles.map((profile) => ({
            avatar: {
              name: profileName(profile),
              src: profile.avatar_url,
            },
            label: `${profileName(profile)} (assigned or reporter)`,
            value: profileName(profile),
          })),
        ]}
      />
    </FilterPanel>
  );
}
