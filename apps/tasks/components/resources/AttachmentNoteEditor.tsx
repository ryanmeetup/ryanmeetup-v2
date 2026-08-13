"use client";

import { useState } from "react";
import { Button, Input, Textarea, toast } from "@ryanmeetup/ui";

export function AttachmentNoteEditor({ kind, resourceId, saving, onCancel, onSave }: {
  kind: "category" | "project";
  resourceId?: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (title: string, body: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  async function save() {
    try { await onSave(title, body); setTitle(""); setBody(""); }
    catch (error) { toast.error(error instanceof Error ? error.message : "The note could not be attached."); }
  }
  return <div className="space-y-3 rounded-lg border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-black/10">
    <Input label="Note title" required name={`${kind}-note-title-${resourceId ?? "new"}`} value={title} maxLength={200} disabled={saving} onChange={(event) => setTitle(event.target.value)} />
    <Textarea id={`${kind}-note-body-${resourceId ?? "new"}`} label="Note" required name={`${kind}-note-body-${resourceId ?? "new"}`} value={body} maxLength={10000} rows={4} disabled={saving} onChange={(event) => setBody(event.target.value)} />
    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" size="sm" disabled={saving} onClick={onCancel}>Cancel</Button><Button type="button" size="sm" loading={saving} loadingText="Saving..." onClick={() => void save()}>Save note</Button></div>
  </div>;
}
