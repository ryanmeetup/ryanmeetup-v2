"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { FiX } from "react-icons/fi";
import { getFieldLabelClasses } from "./fieldStyles";

export type TagInputProps = {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
  maxTagLength?: number;
};

export function TagInput({
  label,
  value,
  onChange,
  placeholder = "Type a tag, then press Enter",
  disabled = false,
  maxTags = 20,
  maxTagLength = 40,
}: TagInputProps) {
  const inputId = useId();
  const [draft, setDraft] = useState("");

  function addDraft() {
    const tag = draft.trim().replace(/,$/, "").trim();
    if (!tag || value.length >= maxTags) return;
    if (!value.some((item) => item.toLowerCase() === tag.toLowerCase())) {
      onChange([...value, tag]);
    }
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if ((event.key === "Enter" || event.key === "Tab") && draft.trim()) {
      event.preventDefault();
      addDraft();
    } else if (event.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className={getFieldLabelClasses()} htmlFor={inputId}>
        <span>{label}</span>
      </label>
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-black/20 bg-white px-3 py-2 shadow-sm transition focus-within:ring-2 focus-within:ring-black/30 dark:border-white/20 dark:bg-white/10 dark:focus-within:ring-white/30">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-black/15 bg-black/5 py-1 pl-2.5 pr-1 text-xs font-semibold text-black/75 dark:border-white/15 dark:bg-white/10 dark:text-white/80"
          >
            <span className="truncate">{tag}</span>
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(value.filter((item) => item !== tag))}
              disabled={disabled}
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full transition hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed dark:hover:bg-white/15 dark:focus-visible:ring-white/30"
            >
              <FiX aria-hidden className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addDraft}
          placeholder={value.length === 0 ? placeholder : "Add another…"}
          disabled={disabled || value.length >= maxTags}
          maxLength={maxTagLength}
          className="min-w-36 flex-1 bg-transparent px-1 py-1 text-sm text-black outline-none placeholder:text-black/45 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white dark:placeholder:text-white/45"
        />
      </div>
      <p className="text-xs text-black/50 dark:text-white/50">
        Press Enter or Tab to add a tag. {value.length}/{maxTags}
      </p>
    </div>
  );
}
