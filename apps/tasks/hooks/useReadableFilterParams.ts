"use client";

import { useEffect } from "react";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import type { TaskFiltersState } from "@/hooks/useTaskFilters";
import type { ResolvedTaskFilters } from "@/hooks/useResolvedTaskFilters";
import { profileDisplayName } from "@/lib/presentation";

/**
 * Filters travel in the URL as ids the first time they are set, then get
 * rewritten in place to the names people recognize once the matching workspace
 * row is known. Every effect here is that one-way rewrite for a single filter.
 */
export function useReadableFilterParams({
  data,
  filters,
  resolved,
}: {
  data: WorkspaceData;
  filters: TaskFiltersState;
  resolved: ResolvedTaskFilters;
}) {
  const {
    assignee,
    setAssignee,
    excludedAssignees,
    setExcludedAssignees,
    reporter,
    setReporter,
    excludedReporters,
    setExcludedReporters,
    group,
    setGroup,
    includedCategories,
    setIncludedCategories,
    excludedCategories,
    setExcludedCategories,
    project,
    setProject,
    excludedProjects,
    setExcludedProjects,
    status,
    setStatus,
    excludedStatuses,
    setExcludedStatuses,
    priority,
    setPriority,
  } = filters;
  const {
    categories,
    categoryNames,
    excludedAssigneeIds,
    excludedCategoryIds,
    excludedProjectIds,
    excludedReporterIds,
    excludedStatusIds,
    includedCategoryIds,
    profiles,
    projects,
    selectedAssignee,
    selectedCategory,
    selectedPriority,
    selectedProject,
    selectedReporter,
    selectedStatus,
  } = resolved;

  useEffect(() => {
    if (assignee !== "all" && profiles.has(assignee) && selectedAssignee) {
      setAssignee(profileDisplayName(selectedAssignee));
    } else if (assignee === "unassigned") {
      setAssignee("Unassigned");
    }
  }, [assignee, profiles, selectedAssignee, setAssignee]);
  useEffect(() => {
    if (reporter !== "all" && profiles.has(reporter) && selectedReporter) {
      setReporter(profileDisplayName(selectedReporter));
    }
  }, [profiles, reporter, selectedReporter, setReporter]);
  useEffect(() => {
    const readable = excludedAssigneeIds
      .map((id) =>
        id === "unassigned"
          ? "Unassigned"
          : profileDisplayName(profiles.get(id)),
      )
      .join(",");
    if (excludedAssignees && excludedAssignees !== readable)
      setExcludedAssignees(readable);
  }, [excludedAssigneeIds, excludedAssignees, profiles, setExcludedAssignees]);
  useEffect(() => {
    const readable = excludedReporterIds
      .map((id) => profileDisplayName(profiles.get(id)))
      .join(",");
    if (excludedReporters && excludedReporters !== readable)
      setExcludedReporters(readable);
  }, [excludedReporterIds, excludedReporters, profiles, setExcludedReporters]);
  useEffect(() => {
    if (group !== "all" && categories.has(group) && selectedCategory)
      setGroup(selectedCategory.name);
  }, [categories, group, selectedCategory, setGroup]);
  useEffect(() => {
    if (
      project !== "all" &&
      project !== "none" &&
      projects.has(project) &&
      selectedProject
    )
      setProject(selectedProject.name);
  }, [project, projects, selectedProject, setProject]);
  useEffect(() => {
    const readable = excludedProjectIds
      .map((id) => (id === "none" ? "none" : (projects.get(id)?.name ?? "")))
      .filter(Boolean)
      .join(",");
    if (excludedProjects && excludedProjects !== readable)
      setExcludedProjects(readable);
  }, [excludedProjectIds, excludedProjects, projects, setExcludedProjects]);
  useEffect(() => {
    const readableIncluded = categoryNames(includedCategoryIds);
    const readableExcluded = categoryNames(excludedCategoryIds);
    if (includedCategories && includedCategories !== readableIncluded)
      setIncludedCategories(readableIncluded);
    if (excludedCategories && excludedCategories !== readableExcluded)
      setExcludedCategories(readableExcluded);
  }, [
    categoryNames,
    excludedCategories,
    excludedCategoryIds,
    includedCategories,
    includedCategoryIds,
    setExcludedCategories,
    setIncludedCategories,
  ]);
  useEffect(() => {
    if (status !== "all" && selectedStatus && status !== selectedStatus.name) {
      setStatus(selectedStatus.name);
    }
  }, [selectedStatus, setStatus, status]);
  useEffect(() => {
    const readable = excludedStatusIds
      .map((id) => data.statuses.find((item) => item.id === id)?.name ?? "")
      .filter(Boolean)
      .join(",");
    if (excludedStatuses && excludedStatuses !== readable)
      setExcludedStatuses(readable);
  }, [data.statuses, excludedStatusIds, excludedStatuses, setExcludedStatuses]);
  useEffect(() => {
    if (selectedPriority) {
      const readablePriority =
        selectedPriority[0].toUpperCase() + selectedPriority.slice(1);
      if (priority !== readablePriority) setPriority(readablePriority);
    }
  }, [priority, selectedPriority, setPriority]);
}
