"use client";

import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Button,
  ConfirmationDialog,
  DropdownSelect,
  IconButton,
  Input,
  Textarea,
  toast,
} from "@ryanmeetup/ui";
import {
  FiArchive,
  FiCheck,
  FiClock,
  FiFileText,
  FiPlus,
  FiRotateCcw,
  FiTrash2,
} from "react-icons/fi";
import { WorkspacePageShell } from "@/components/global";
import { NewTaskModal } from "@/components/tasks";
import { TaskCategoryBadge } from "@/components/tasks/TaskCategoryBadge";
import {
  noteAutosaveDelayMs,
  noteTaskDescription,
  noteTitle,
} from "@/lib/notes";
import type { Note, Task, WorkspaceData } from "@/lib/types";
import type { StoredTaskDraft } from "@/lib/task-drafts";
import { taskPath } from "@/lib/task-key";

type SaveState = "idle" | "saving" | "saved" | "error";

async function responseJson<T>(response: Response) {
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Something went wrong.");
  return result;
}

function NoteCard({
  note,
  profiles,
  demoMode,
  onChange,
  onConvert,
  onDelete,
  convertedTask,
  categories,
}: {
  note: Note;
  profiles: WorkspaceData["profiles"];
  demoMode: boolean;
  onChange: (note: Note) => void;
  onConvert: (note: Note) => void;
  onDelete: (note: Note) => void;
  convertedTask?: Task;
  categories: WorkspaceData["categories"];
}) {
  const [title, setTitle] = useState(note.title ?? "");
  const [body, setBody] = useState(note.body);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const changed = useRef(false);
  const author = profiles.find((profile) => profile.id === note.created_by);
  const category = categories.find((item) => item.id === note.category_id);

  useEffect(() => {
    if (!changed.current || !body.trim() || note.archived_at) return;
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      try {
        const updated = demoMode
          ? {
              ...note,
              title: title.trim() || null,
              body: body.trim(),
              updated_at: new Date().toISOString(),
            }
          : (
              await responseJson<{ note: Note }>(
                await fetch("/api/notes", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: note.id, title, body }),
                }),
              )
            ).note;
        changed.current = false;
        onChange(updated);
        setSaveState("saved");
      } catch (error) {
        setSaveState("error");
        toast.error(
          error instanceof Error
            ? error.message
            : "The note could not be saved.",
        );
      }
    }, noteAutosaveDelayMs);
    return () => window.clearTimeout(timer);
  }, [body, demoMode, note, onChange, title]);

  return (
    <article className="rounded-2xl border border-black/10 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.025] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black/5 text-black/55 dark:bg-white/10 dark:text-white/60">
          <FiFileText aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <Input
            label="Note title"
            name={`note-title-${note.id}`}
            hideLabel
            placeholder="Optional title"
            value={title}
            maxLength={200}
            disabled={Boolean(note.archived_at)}
            onChange={(event) => {
              changed.current = true;
              setTitle(event.target.value);
            }}
          />
          <Textarea
            id={`note-body-${note.id}`}
            label="Note text"
            name={`note-body-${note.id}`}
            hideLabel
            value={body}
            rows={4}
            maxLength={10000}
            disabled={Boolean(note.archived_at)}
            onChange={(event) => {
              changed.current = true;
              setBody(event.target.value);
            }}
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-black/50 dark:text-white/50">
            <span className="inline-flex items-center gap-2 font-medium text-black/65 dark:text-white/65">
              <Avatar
                name={author?.full_name ?? "Unknown teammate"}
                src={author?.avatar_url}
                size="sm"
              />
              {author?.full_name ?? "Unknown teammate"}
            </span>
            {category && <TaskCategoryBadge category={category} />}
            <time
              dateTime={note.updated_at}
              className="inline-flex items-center gap-1.5"
            >
              <FiClock className="shrink-0" aria-hidden />
              Updated {new Date(note.updated_at).toLocaleString()}
            </time>
            <span className="ml-auto" role="status">
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "Saved"}
              {saveState === "error" && "Not saved"}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-black/10 pt-3 dark:border-white/10">
        {note.converted_task_id ? (
          <Button.Link
            href={convertedTask ? taskPath(convertedTask) : "/board"}
            size="sm"
            variant="secondary"
            leftIcon={<FiCheck />}
          >
            View task
          </Button.Link>
        ) : !note.archived_at ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              onConvert({ ...note, title: title.trim() || null, body })
            }
          >
            Convert to task
          </Button>
        ) : null}
        <IconButton
          label={
            note.archived_at
              ? `Restore “${noteTitle(note)}”`
              : `Archive “${noteTitle(note)}”`
          }
          onClick={() =>
            void onChange({
              ...note,
              archived_at: note.archived_at ? null : new Date().toISOString(),
            })
          }
        >
          {note.archived_at ? <FiRotateCcw /> : <FiArchive />}
        </IconButton>
        <IconButton
          label={`Delete “${noteTitle(note)}”`}
          variant="danger"
          onClick={() => onDelete(note)}
        >
          <FiTrash2 />
        </IconButton>
      </div>
    </article>
  );
}

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
            await responseJson<{ note: Note }>(
              await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body, categoryId }),
              }),
            )
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
      const result = await responseJson<{ note: Note }>(
        await fetch("/api/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: next.id,
            archived: Boolean(next.archived_at),
          }),
        }),
      );
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
        await responseJson(
          await fetch("/api/notes", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: deleteTarget.id }),
          }),
        );
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

  const activeNotes = notes.filter(
    (note) => Boolean(note.archived_at) === showArchived,
  );
  const conversionDraft: StoredTaskDraft | null = convertTarget
    ? {
        id: `note-${convertTarget.id}`,
        updatedAt: new Date().toISOString(),
        draft: {
          title: noteTitle(convertTarget),
          description: noteTaskDescription(convertTarget),
          status_id:
            data.statuses.find(
              (status) => status.name.toLowerCase() === "backlog",
            )?.id ??
            data.statuses.find((status) => status.is_default)?.id ??
            data.statuses[0]?.id ??
            "",
          project_id: null,
          assignee_id: null,
          reported_by: data.currentProfile.id,
          start_date: null,
          due_date: null,
          due_time: null,
          reminder_at: null,
          priority: "medium",
          category_ids: convertTarget.category_id
            ? [convertTarget.category_id]
            : [],
          category_tags: {},
        },
      }
    : null;

  async function markConverted(task: Task) {
    if (!convertTarget) return;
    try {
      const updated = demoMode
        ? {
            ...convertTarget,
            converted_task_id: task.id,
            updated_at: new Date().toISOString(),
          }
        : (
            await responseJson<{ note: Note }>(
              await fetch("/api/notes", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: convertTarget.id,
                  convertedTaskId: task.id,
                }),
              }),
            )
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
              name="quick-note"
              value={body}
              rows={4}
              maxLength={10000}
              placeholder="Drop the thought here…"
              onChange={(event) => setBody(event.target.value)}
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <DropdownSelect
                label="Category"
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
