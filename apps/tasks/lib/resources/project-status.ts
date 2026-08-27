import type { ProjectStatus } from "./resource-types";

export const projectStatusOptions: {
  color: string;
  label: string;
  value: ProjectStatus;
}[] = [
  { label: "Exploring", value: "exploring", color: "#7c3aed" },
  { label: "Planned", value: "planned", color: "#2563eb" },
  { label: "Active development", value: "active", color: "#d97706" },
  { label: "Ongoing", value: "ongoing", color: "#0891b2" },
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
