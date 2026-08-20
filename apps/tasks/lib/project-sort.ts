import type { Project } from "@/lib/resource-types";

export function sortFavoriteProjectsFirst(
  projects: Project[],
  favoriteProjectIds: string[],
) {
  const favorites = new Set(favoriteProjectIds);

  return projects
    .map((project, index) => ({ project, index }))
    .sort((left, right) => {
      const favoriteDifference =
        Number(favorites.has(right.project.id)) -
        Number(favorites.has(left.project.id));

      return favoriteDifference || left.index - right.index;
    })
    .map(({ project }) => project);
}
