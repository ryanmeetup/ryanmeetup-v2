"use client";

import { useEffect, useRef, useState } from "react";
import { mutate } from "@/lib/mutation-client";
import { applyNoteDraft, noteAutosaveDelayMs } from "@/lib/resources/notes";
import type { Note } from "@/lib/resources/resource-types";

export type NoteSaveState = "idle" | "saving" | "saved" | "error";

export function useNoteDraft(
  note: Note,
  demoMode: boolean,
  onSave: (note: Note) => void,
) {
  const [title, setTitleValue] = useState(note.title ?? "");
  const [body, setBodyValue] = useState(note.body);
  const [saveState, setSaveState] = useState<NoteSaveState>("idle");
  const changed = useRef(false);

  useEffect(() => {
    if (!changed.current || !body.trim() || note.archived_at) return;
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      try {
        const updated = demoMode
          ? applyNoteDraft(note, title, body)
          : (
              await mutate<{ note: Note }>("/api/notes", {
                method: "PATCH",
                body: JSON.stringify({ id: note.id, title, body }),
              })
            ).note;
        changed.current = false;
        onSave(updated);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, noteAutosaveDelayMs);
    return () => window.clearTimeout(timer);
  }, [body, demoMode, note, onSave, title]);

  return {
    title,
    body,
    saveState,
    setTitle(value: string) {
      changed.current = true;
      setTitleValue(value);
    },
    setBody(value: string) {
      changed.current = true;
      setBodyValue(value);
    },
  };
}
