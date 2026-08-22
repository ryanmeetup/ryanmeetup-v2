"use client";

import { useCallback, useRef, useState, type KeyboardEvent } from "react";

// Keys the listbox owns: they bubble out of the search field so option
// navigation keeps working while the query has focus.
const navigationKeys = new Set([
  "ArrowDown",
  "ArrowUp",
  "Enter",
  "Escape",
  "Tab",
]);

const isPrintableKey = (event: KeyboardEvent<HTMLElement>) =>
  event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey;

/**
 * Lets an open dropdown act like its search field is already focused: the first
 * typed character moves focus into the field and seeds the query instead of
 * feeding the listbox typeahead.
 */
export function useDropdownSearch() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");

  const handleOptionsKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const input = inputRef.current;
      if (!input || event.target === input) return;
      const typed = isPrintableKey(event);
      // A leading space stays with the listbox so it can toggle the active option.
      if (typed && event.key === " " && query.length === 0) return;
      if (!typed && !(event.key === "Backspace" && query.length > 0)) return;
      event.preventDefault();
      event.stopPropagation();
      setQuery(typed ? query + event.key : query.slice(0, -1));
      input.focus();
    },
    [query],
  );

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!navigationKeys.has(event.key)) event.stopPropagation();
    },
    [],
  );

  return { handleInputKeyDown, handleOptionsKeyDown, inputRef, query, setQuery };
}
