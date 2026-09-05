import type { Project } from "./resource-types";

/** Enough of a project to name it in a URL. */
export type ProjectRef = Pick<Project, "id" | "name">;

export function projectSlug(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
}

/**
 * Names a project with its readable slug when that slug is unambiguous.
 * Duplicate or non-Latin-only names keep their id rather than producing a URL
 * that could resolve to the wrong project.
 */
export function projectRouteId(project: ProjectRef, projects: ProjectRef[]) {
  const slug = projectSlug(project.name);
  if (!slug) return project.id;
  const sharing = projects.filter(
    (candidate) => projectSlug(candidate.name) === slug,
  );
  return sharing.length === 1 ? slug : project.id;
}

/** Resolves both readable routes and id-based compatibility routes. */
export function findProjectByRouteId<Item extends ProjectRef>(
  projects: Item[],
  routeId: string,
) {
  const slug = routeId.trim().toLowerCase();
  const named = projects.filter(
    (project) => projectSlug(project.name) === slug,
  );
  if (named.length === 1) return named[0];
  return projects.find((project) => project.id === routeId);
}

export function projectPath(project: ProjectRef, projects: ProjectRef[]) {
  return `/projects/${projectRouteId(project, projects)}`;
}
