"use client";

import { useEffect, useRef, useState } from "react";

const storageKey = "ryanmeetup.tasks.sidebar-sections";

export function useSidebarSections() {
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const loaded = useRef(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as {
          categoriesExpanded?: boolean;
          projectsExpanded?: boolean;
        };
        setCategoriesExpanded(saved.categoriesExpanded ?? true);
        setProjectsExpanded(saved.projectsExpanded ?? true);
      } catch {
        localStorage.removeItem(storageKey);
      } finally {
        loaded.current = true;
      }
    });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({ categoriesExpanded, projectsExpanded }),
    );
  }, [categoriesExpanded, projectsExpanded]);

  return {
    categoriesExpanded,
    setCategoriesExpanded,
    projectsExpanded,
    setProjectsExpanded,
  };
}
