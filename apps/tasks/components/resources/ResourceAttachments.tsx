"use client";

import { useState } from "react";
import { Button, DisclosureCard } from "@ryanmeetup/ui";
import { FiPlus } from "react-icons/fi";
import { CountBadge } from "@/components/global";
import type { ResourceAttachmentDraft } from "@/lib/resource-management";
import { AttachmentList } from "./AttachmentList";
import { AttachmentNoteEditor } from "./AttachmentNoteEditor";
import { AttachmentUploadControl } from "./AttachmentUploadControl";
import { useResourceAttachments } from "./useResourceAttachments";

export function ResourceAttachments({ resource, editor, draftState }: {
  resource: { kind: "project" | "category"; id?: string };
  editor: { demoMode: boolean; disabled: boolean; currentUserId: string };
  draftState?: { drafts: ResourceAttachmentDraft[]; onChange: (drafts: ResourceAttachmentDraft[]) => void };
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const controller = useResourceAttachments({ kind: resource.kind, resourceId: resource.id, demoMode: editor.demoMode, currentUserId: editor.currentUserId, draftState });
  const cardClass = "rounded-xl border border-black/10 bg-black/[0.015] p-3 dark:border-white/10 dark:bg-white/[0.025]";
  return <div className="space-y-4">
    <DisclosureCard defaultOpen collapsible={controller.notes.length > 0 || noteOpen} className={cardClass} buttonClassName="flex w-fit items-center gap-2 text-left" panelClassName="pt-3" iconClassName="h-3.5 w-3.5" description={<p className="pr-2 text-xs leading-relaxed text-black/55 dark:text-white/55">Keep useful context with the {resource.kind}.</p>} actions={<Button type="button" variant="secondary" size="sm" leftIcon={<FiPlus aria-hidden />} className="shrink-0 px-3 py-1.5 normal-case tracking-normal" disabled={editor.disabled || controller.saving} onClick={() => setNoteOpen((open) => !open)}>Add note</Button>} summary={<span className="flex items-center gap-2 text-sm font-semibold">Notes{controller.notes.length > 0 && <CountBadge>{controller.notes.length}</CountBadge>}</span>}>
      {noteOpen && <AttachmentNoteEditor kind={resource.kind} resourceId={resource.id} saving={controller.saving} onCancel={() => setNoteOpen(false)} onSave={async (title, body) => { await controller.addNote(title, body); setNoteOpen(false); }} />}
      <AttachmentList items={controller.notes} type="note" loading={controller.loading} disabled={editor.disabled || controller.saving} onRemove={(item) => void controller.remove(item)} />
    </DisclosureCard>
    <DisclosureCard defaultOpen collapsible={controller.files.length > 0} className={cardClass} buttonClassName="flex w-fit items-center gap-2 text-left" panelClassName="pt-3" iconClassName="h-3.5 w-3.5" description={<p className="pr-2 text-xs leading-relaxed text-black/55 dark:text-white/55">Add photos, PDFs, or text files. 10 MB maximum per file.</p>} actions={<AttachmentUploadControl kind={resource.kind} disabled={editor.disabled} saving={controller.saving} onFiles={(files) => void controller.uploadFiles(files)} />} summary={<span className="flex items-center gap-2 text-sm font-semibold">Attachments{controller.files.length > 0 && <CountBadge>{controller.files.length}</CountBadge>}</span>}>
      <AttachmentList items={controller.files} type="file" loading={controller.loading} disabled={editor.disabled || controller.saving} onRemove={(item) => void controller.remove(item)} />
    </DisclosureCard>
  </div>;
}
