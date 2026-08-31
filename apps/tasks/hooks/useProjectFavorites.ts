"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "@ryanmeetup/ui";
import { errorMessage } from "@/lib/presentation";
import type { Project } from "@/lib/resources/resource-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";

/**
 * Owns the viewer's favorite projects so every surface that shows a star - the
 * projects modal and the workspace header - reads and toggles the same state.
 */
export function useProjectFavorites({
  data,
  setData,
  demoMode,
}: {
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  demoMode: boolean;
}) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const favoriteIds = data.currentProfile.favorite_project_ids ?? [];

  async function toggle(project: Project) {
    const favorite = !favoriteIds.includes(project.id);
    setPendingIds((current) => new Set(current).add(project.id));
    try {
      let favoriteProjectIds = favorite
        ? [...favoriteIds, project.id]
        : favoriteIds.filter((projectId) => projectId !== project.id);
      if (!demoMode) {
        const response = await fetch("/api/profile/favorite-projects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, favorite }),
        });
        const result = (await response.json()) as {
          error?: string;
          favoriteProjectIds?: string[];
        };
        if (!response.ok || !result.favoriteProjectIds) {
          throw new Error(result.error ?? "Your favorite could not be saved.");
        }
        favoriteProjectIds = result.favoriteProjectIds;
      }
      setData((current) => ({
        ...current,
        currentProfile: {
          ...current.currentProfile,
          favorite_project_ids: favoriteProjectIds,
        },
      }));
      toast.success(
        `${project.name} ${favorite ? "added to" : "removed from"} favorites.`,
      );
    } catch (error) {
      toast.error(errorMessage(error, "Your favorite could not be saved."));
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(project.id);
        return next;
      });
    }
  }

  return {
    isFavorite: (projectId: string) => favoriteIds.includes(projectId),
    isPending: (projectId: string) => pendingIds.has(projectId),
    toggle,
  };
}
