import { FiStar } from "react-icons/fi";

export const favoriteProjectsGroupLabel = "Favorites";

const favoriteProjectsGroup = {
  icon: (
    <FiStar
      aria-hidden
      className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-500 dark:fill-yellow-300 dark:text-yellow-400"
    />
  ),
  label: favoriteProjectsGroupLabel,
};

const projectsGroup = { label: "Projects" };

export function projectOptionGroup(favorite: boolean) {
  return favorite ? favoriteProjectsGroup : projectsGroup;
}
