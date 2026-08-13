"use client";

import { useState } from "react";
import {
  Button,
  ConfirmationDialog,
  DropdownSelect,
  Textarea,
  toast,
} from "@ryanmeetup/ui";
import { FiFileText, FiPlus } from "react-icons/fi";
import { WorkspacePageShell } from "@/components/global";
import { NewTaskModal } from "@/components/tasks";
import { filterNotes, linkNoteToTask, noteConversionDraft } from "@/lib/notes";
import type { Note } from "@/lib/resource-types";
import type { Task } from "@/lib/task-types";
import type { WorkspaceData } from "@/lib/workspace-types";
import { mutate } from "@/lib/mutation-client";
import { NoteCard } from "./NoteCard";
export function NotesPageClient({
  initialData,
  initialNotes,
  demoMode,
}: {
  initialData: WorkspaceData;
  initialNotes: Note[];
  demoMode: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [notes, setNotes] = useState(initialNotes);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [convertTarget, setConvertTarget] = useState<Note | null>(null);

  async function createNote() {
    if (!body.trim()) return;
    setCreating(true);
    try {
      const note: Note = demoMode
        ? {
            id: crypto.randomUUID(),
            title: null,
            body: body.trim(),
            created_by: data.currentProfile.id,
            category_id: categoryId || null,
            converted_task_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            archived_at: null,
          }
        : (
            await mutate<{ note: Note }>("/api/notes", {
              method: "POST",
              body: JSON.stringify({ body, categoryId }),
            })
          ).note;
      setNotes((current) => [note, ...current]);
      setBody("");
      setCategoryId("");
      toast.success("Note saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The note could not be saved.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function updateNote(next: Note) {
    const previous = notes.find((item) => item.id === next.id);
    setNotes((current) =>
      current.map((item) => (item.id === next.id ? next : item)),
    );
    if (demoMode || previous?.archived_at === next.archived_at) return;
    try {
      const result = await mutate<{ note: Note }>("/api/notes", {
        method: "PATCH",
        body: JSON.stringify({
          id: next.id,
          archived: Boolean(next.archived_at),
        }),
      });
      setNotes((current) =>
        current.map((item) => (item.id === next.id ? result.note : item)),
      );
      toast.success(next.archived_at ? "Note archived." : "Note restored.");
    } catch (error) {
      if (previous)
        setNotes((current) =>
          current.map((item) => (item.id === next.id ? previous : item)),
        );
      toast.error(
        error instanceof Error
          ? error.message
          : "The note could not be updated.",
      );
    }
  }

  async function deleteNote() {
    if (!deleteTarget) return;
    try {
      if (!demoMode)
        await mutate("/api/notes", {
          method: "DELETE",
          body: JSON.stringify({ id: deleteTarget.id }),
        });
      setNotes((current) =>
        current.filter((note) => note.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      toast.success("Note deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The note could not be deleted.",
      );
    }
  }

  const activeNotes = filterNotes(notes, showArchived);
  const conversionDraft = convertTarget
    ? noteConversionDraft(convertTarget, data.statuses, data.currentProfile.id)
    : null;

  async function markConverted(task: Task) {
    if (!convertTarget) return;
    try {
      const updated = demoMode
        ? linkNoteToTask(convertTarget, task)
        : (
            await mutate<{ note: Note }>("/api/notes", {
              method: "PATCH",
              body: JSON.stringify({
                id: convertTarget.id,
                convertedTaskId: task.id,
              }),
            })
          ).note;
      setNotes((current) =>
        current.map((note) => (note.id === updated.id ? updated : note)),
      );
      toast.success("Note converted to a task.");
    } catch {
      toast.error(
        "The task was created, but the note could not be linked to it.",
      );
    } finally {
      setConvertTarget(null);
    }
  }

  return (
    <>
      <WorkspacePageShell
        data={data}
        setData={setData}
        demoMode={demoMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        contentClassName="p-4 sm:p-6 xl:p-8"
      >
        <div className="mx-auto max-w-7xl space-y-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
              Shared scratchpad
            </p>
            <h1 className="mt-2 font-cooper text-3xl sm:text-4xl">Notes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/65 dark:text-white/65">
              Catch quick thoughts before they escape. When an idea becomes real
              work, turn it into a task.
            </p>
          </header>

          <section className="rounded-2xl border border-black/10 bg-white/90 p-4 shadow-[0_12px_35px_rgba(0,0,0,0.045)] dark:border-white/10 dark:bg-white/[0.055] dark:shadow-none sm:p-5">
            <Textarea
              id="quick-note"
              label="Quick note"
              required
              name="quick-note"
              value={body}
              rows={4}
              maxLength={10000}
              placeholder="Drop the thought here…"
              onChange={(event) => setBody(event.target.value)}
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <DropdownSelect
                label="Category (optional)"
                value={categoryId}
                onChange={setCategoryId}
                options={[
                  { label: "Uncategorized", value: "" },
                  ...data.categories
                    .filter((category) => !category.archived_at)
                    .map((category) => ({
                      label: category.name,
                      value: category.id,
                      color: category.color,
                    })),
                ]}
              />
              <Button
                type="button"
                className="w-full sm:w-auto"
                leftIcon={<FiPlus />}
                loading={creating}
                loadingText="Saving…"
                disabled={!body.trim()}
                onClick={() => void createNote()}
              >
                Save note
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white/90 p-4 shadow-[0_12px_35px_rgba(0,0,0,0.045)] dark:border-white/10 dark:bg-white/[0.055] dark:shadow-none sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">
                {showArchived ? "Archived notes" : "Recent notes"}
              </h2>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowArchived((value) => !value)}
              >
                {showArchived ? "View active" : "View archive"}
              </Button>
            </div>

            {activeNotes.length ? (
              <div className="grid items-start gap-4 xl:grid-cols-2">
                {activeNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    profiles={data.profiles}
                    categories={data.categories}
                    demoMode={demoMode}
                    onChange={(next) => void updateNote(next)}
                    onConvert={setConvertTarget}
                    onDelete={setDeleteTarget}
                    convertedTask={data.tasks.find(
                      (task) => task.id === note.converted_task_id,
                    )}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-black/15 px-6 py-12 text-center dark:border-white/15">
                <FiFileText className="mx-auto text-2xl text-black/35 dark:text-white/35" />
                <p className="mt-3 font-semibold">
                  {showArchived ? "Nothing archived" : "No loose thoughts yet"}
                </p>
                <p className="mt-1 text-sm text-black/55 dark:text-white/55">
                  {showArchived
                    ? "Archived notes will wait here."
                    : "Add the first note above—polish is optional."}
                </p>
              </div>
            )}
          </section>
        </div>
      </WorkspacePageShell>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        setOpen={(open) => !open && setDeleteTarget(null)}
        title="Delete this note?"
        description="This permanently removes the shared note. This cannot be undone."
        confirmLabel="Delete note"
        destructive
        onConfirm={() => void deleteNote()}
      />

      {convertTarget && conversionDraft && (
        <NewTaskModal
          key={convertTarget.id}
          data={data}
          setData={setData}
          demoMode={demoMode}
          open
          setOpen={(open) => !open && setConvertTarget(null)}
          initialDraft={conversionDraft}
          onCreated={markConverted}
        />
      )}
    </>
  );
}
