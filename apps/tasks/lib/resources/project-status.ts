import type { ProjectStatus } from "./resource-types";

export const projectStatusOptions: {
  color: string;
  label: string;
  value: ProjectStatus;
}[] = [
  { label: "Active", value: "active", color: "#d97706" },
  { label: "Queued", value: "queued", color: "#2563eb" },
  { label: "Discovery", value: "discovery", color: "#7c3aed" },
  { label: "Paused", value: "paused", color: "#64748b" },
  { label: "Complete", value: "complete", color: "#059669" },
];

export const defaultProjectStatus: ProjectStatus = "active";

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
  return projectStatusOptions
    .map((option) => ({
      ...option,
      projects: projects.filter((project) => project.status === option.value),
    }))
    .filter((group) => group.projects.length > 0);
}
