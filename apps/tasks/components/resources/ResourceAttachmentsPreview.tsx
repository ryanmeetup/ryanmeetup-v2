"use client";

import { useState } from "react";
import { FormattedText, Modal } from "@ryanmeetup/ui";
import { FiFile, FiFileText } from "react-icons/fi";
import type { ResourceAttachmentDraft } from "@/lib/resource-management";

const pillClassName =
  "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-black/70 transition hover:border-black/20 hover:bg-black/5 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-white";

export function ResourceAttachmentsPreview({
  notes,
  files,
  className = "",
}: {
  notes: ResourceAttachmentDraft[];
  files: ResourceAttachmentDraft[];
  className?: string;
}) {
  const [openNote, setOpenNote] = useState<ResourceAttachmentDraft | null>(null);

  if (notes.length === 0 && files.length === 0) return null;

  return (
    <>
      <nav
        aria-label="Attachments"
        className={`flex flex-wrap gap-2 ${className}`}
      >
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            className={pillClassName}
            onClick={() => setOpenNote(note)}
          >
            <FiFileText aria-hidden className="shrink-0" />
            <span className="truncate">{note.name}</span>
          </button>
        ))}
        {files.map((file) => (
          <a
            key={file.id}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className={pillClassName}
          >
            <FiFile aria-hidden className="shrink-0" />
            <span className="truncate">{file.name}</span>
          </a>
        ))}
      </nav>
      <Modal
        open={openNote !== null}
        setIsOpen={(open) => {
          if (!open) setOpenNote(null);
        }}
        title={openNote?.name ?? ""}
        hideActions
        size="lg"
      >
        {openNote?.body && (
          <FormattedText
            text={openNote.body}
            className="text-sm leading-relaxed text-black/75 dark:text-white/75"
          />
        )}
      </Modal>
    </>
  );
}
