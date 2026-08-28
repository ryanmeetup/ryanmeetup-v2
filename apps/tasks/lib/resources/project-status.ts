import type { ProjectStatus } from "./resource-types";

export const projectStatusOptions: {
  color: string;
  label: string;
  value: ProjectStatus;
}[] = [
  { label: "Discovery", value: "discovery", color: "#7c3aed" },
  { label: "Queued", value: "queued", color: "#2563eb" },
  { label: "Active", value: "active", color: "#d97706" },
  { label: "Complete", value: "complete", color: "#059669" },
  { label: "Paused", value: "paused", color: "#64748b" },
];

export const defaultProjectStatus: ProjectStatus = "discovery";

// The form lists statuses in the order a project moves through them; the
// projects page leads with the work that wants attention now.
export const projectStatusSectionOrder: ProjectStatus[] = [
  "active",
  "queued",
  "discovery",
  "paused",
  "complete",
];

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return projectStatusOptions.some((option) => option.value === value);
}

export function projectStatusDetails(status: ProjectStatus) {
  return (
    projectStatusOptions.find((option) => option.value === status) ??
    projectStatusOptions.find(
      (option) => option.value === defaultProjectStatus,
    )!
  );
}

export function shouldOfferProjectArchive(
  previousStatus: ProjectStatus,
  nextStatus: ProjectStatus,
  archivedAt: string | null,
) {
  return (
    previousStatus !== "complete" &&
    nextStatus === "complete" &&
    archivedAt === null
  );
}

export function groupProjectsByStatus<T extends { status: ProjectStatus }>(
  projects: T[],
) {
  return projectStatusSectionOrder
    .map((status) => ({
      ...projectStatusDetails(status),
      projects: projects.filter((project) => project.status === status),
    }))
    .filter((group) => group.projects.length > 0);
}
