"use client";

import { useEffect, useState } from "react";

const storageKey = "ryanmeetup.tasks.collapsed-note-categories";

export function useCollapsedNoteCategories() {
  const [collapsedCategoryIds, setCollapsedCategoryIds] =
    useState<Set<string> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    queueMicrotask(() => {
      try {
        setCollapsedCategoryIds(
          new Set(saved ? (JSON.parse(saved) as string[]) : []),
        );
      } catch {
        localStorage.removeItem(storageKey);
        setCollapsedCategoryIds(new Set());
      }
    });
  }, []);

  useEffect(() => {
    if (!collapsedCategoryIds) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify([...collapsedCategoryIds]),
    );
  }, [collapsedCategoryIds]);

  const toggleCategorySection = (categoryId: string) => {
    setCollapsedCategoryIds((current) => {
      const next = new Set(current ?? []);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  return { collapsedCategoryIds, toggleCategorySection };
}
