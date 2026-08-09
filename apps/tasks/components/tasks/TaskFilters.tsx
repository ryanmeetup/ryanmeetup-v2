import { Card, DropdownSelect } from "@ryanmeetup/ui";
import { FiFilter } from "react-icons/fi";
import type { Category, Priority, Profile, Project, Status } from "@/lib/types";

const priorities: Priority[] = ["low", "medium", "high", "urgent"];
const profileName = (profile: Profile) => profile.full_name || "Teammate";

export function TaskFilters({
  assignee,
  categories,
  clearFilters,
  filterCount,
  group,
  onAssigneeChange,
  onCategoryChange,
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
  selectedCategory,
  selectedPriority,
  selectedProject,
  selectedReporter,
  selectedStatus,
  status,
  statuses,
  visibility,
}: {
  assignee: string;
  categories: Category[];
  clearFilters: () => void;
  filterCount: number;
  group: string;
  onAssigneeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
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
  selectedCategory?: Category | null;
  selectedPriority?: Priority | null;
  selectedProject?: Project | null;
  selectedReporter?: Profile | null;
  selectedStatus?: Status | null;
  status: string;
  statuses: Status[];
  visibility: string;
}) {
  return (
    <Card size="sm" className="mb-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="flex shrink-0 items-center gap-2 pr-2 text-xs font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
          <FiFilter /> Filters
          {filterCount > 0 && (
            <b className="grid h-5 w-5 place-items-center rounded-full bg-black text-[10px] text-white dark:bg-white dark:text-black">
              {filterCount}
            </b>
          )}
        </span>
        <DropdownSelect
          label="Visibility"
          value={visibility === "archived" ? "Archived tasks" : "Active tasks"}
          onChange={onVisibilityChange}
          options={[
            { label: "Active tasks", value: "active" },
            { label: "Archived tasks", value: "archived" },
          ]}
        />
        <DropdownSelect
          label="Assignee"
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
        <DropdownSelect
          label="Category"
          value={selectedCategory?.name ?? group}
          onChange={onCategoryChange}
          options={[
            { label: "All categories", value: "all" },
            ...categories.map((category) => ({
              label: category.name,
              value: category.name,
              color: category.color,
            })),
          ]}
        />
        <DropdownSelect
          label="Reported by"
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
          value={selectedStatus?.name ?? status}
          onChange={onStatusChange}
          options={[
            { label: "All statuses", value: "all" },
            ...statuses.map((item) => ({ label: item.name, value: item.name })),
          ]}
        />
        <DropdownSelect
          label="Priority"
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
        {filterCount > 0 && (
          <button
            className="shrink-0 text-xs font-semibold text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
            onClick={clearFilters}
          >
            Clear
          </button>
        )}
      </div>
    </Card>
  );
}
