"use client";

import { useCallback, useState, type KeyboardEvent } from "react";

export function useSearchCombobox(resultCount: number, disabled = false) {
  const [open, setOpen] = useState(false);
  const [storedActiveIndex, setActiveIndex] = useState(0);
  const activeIndex = resultCount
    ? Math.min(storedActiveIndex, resultCount - 1)
    : 0;

  const reset = useCallback(() => {
    setOpen(false);
    setActiveIndex(0);
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        reset();
        event.currentTarget.blur();
        return;
      }
      if (disabled || !resultCount) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setOpen(true);
        setActiveIndex((current) => (current + 1) % resultCount);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setOpen(true);
        setActiveIndex((current) => (current - 1 + resultCount) % resultCount);
      }
    },
    [disabled, reset, resultCount],
  );

  return { open, setOpen, activeIndex, setActiveIndex, reset, onKeyDown };
}
