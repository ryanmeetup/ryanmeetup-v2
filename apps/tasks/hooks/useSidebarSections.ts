"use client";

import { useEffect, useRef, useState } from "react";

const storageKey = "ryanmeetup.tasks.sidebar-sections";

export function useSidebarSections() {
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as {
          favoritesExpanded?: boolean;
          categoriesExpanded?: boolean;
          projectsExpanded?: boolean;
        };
        setFavoritesExpanded(saved.favoritesExpanded ?? true);
        setCategoriesExpanded(saved.categoriesExpanded ?? false);
        setProjectsExpanded(saved.projectsExpanded ?? true);
      } catch {
        localStorage.removeItem(storageKey);
      } finally {
        loaded.current = true;
        requestAnimationFrame(() => setSectionsLoaded(true));
      }
    });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        favoritesExpanded,
        categoriesExpanded,
        projectsExpanded,
      }),
    );
  }, [favoritesExpanded, categoriesExpanded, projectsExpanded]);

  return {
    favoritesExpanded,
    setFavoritesExpanded,
    categoriesExpanded,
    setCategoriesExpanded,
    projectsExpanded,
    setProjectsExpanded,
    sectionsLoaded,
  };
}
