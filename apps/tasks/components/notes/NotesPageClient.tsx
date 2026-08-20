"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryParamState } from "@ryanmeetup/hooks";
import {
  Button,
  ConfirmationDialog,
  DropdownSelect,
  FilterChip,
  Modal,
  Textarea,
  toast,
} from "@ryanmeetup/ui";
import { FiFileText, FiPlus } from "react-icons/fi";
import { CountBadge, WorkspacePageShell } from "@/components/global";
import { NewTaskModal } from "@/components/tasks";
import { ProjectsModal } from "@/components/projects";
import {
  filterNotes,
  groupNotesByCategory,
  linkNoteToProject,
  noteConversionDraft,
  noteConversionProjectDraft,
} from "@/lib/notes";
import type { Note, NoteComment, Project } from "@/lib/resource-types";
import type { Task } from "@/lib/task-types";
import { taskPath } from "@/lib/task-key";
import type { WorkspaceData } from "@/lib/workspace-types";
import { mutate } from "@/lib/mutation-client";
import { archiveFilter } from "@/lib/resource-management";
import { NoteCard } from "./NoteCard";
export function NotesPageClient({
  initialData,
  initialNotes,
  initialComments,
  demoMode,
}: {
  initialData: WorkspaceData;
  initialNotes: Note[];
  initialComments: NoteComment[];
  demoMode: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [notes, setNotes] = useState(initialNotes);
  const [comments, setComments] = useState(initialComments);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [creating, setCreating] = useState(false);
  const [noteStatusParam, setNoteStatus] = useQueryParamState(
    "note-status",
    "active",
  );
  const [noteCategoryParam, setNoteCategory] = useQueryParamState(
    "note-category",
    "all",
  );
  const showArchived = archiveFilter(noteStatusParam) === "archived";
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [convertTarget, setConvertTarget] = useState<Note | null>(null);
  const [convertProjectTarget, setConvertProjectTarget] = useState<Note | null>(
    null,
  );
  const canConvertToProject =
    demoMode || data.currentProfile.app_role === "owner";

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
            converted_project_id: null,
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
      setComments((current) =>
        current.filter((comment) => comment.note_id !== deleteTarget.id),
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
  const noteGroups = groupNotesByCategory(activeNotes, data.categories);
  const selectedGroup = noteGroups.find((group) => {
    if (!group.category) return noteCategoryParam === "uncategorized";
    return (
      group.category.name === noteCategoryParam ||
      group.category.id === noteCategoryParam
    );
  });
  const visibleNotes =
    noteCategoryParam === "all" ? activeNotes : (selectedGroup?.notes ?? []);
  const conversionDraft = convertTarget
    ? noteConversionDraft(convertTarget, data.statuses, data.currentProfile.id)
    : null;

  async function markConverted(task: Task) {
    if (!convertTarget) return;
    const convertedNote = convertTarget;
    try {
      if (!demoMode)
        await mutate("/api/notes", {
          method: "DELETE",
          body: JSON.stringify({ id: convertedNote.id }),
        });
      setNotes((current) =>
        current.filter((note) => note.id !== convertedNote.id),
      );
      setComments((current) =>
        current.filter((comment) => comment.note_id !== convertedNote.id),
      );
      toast.success("Note converted to a task and deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `The task was created, but the note could not be deleted: ${error.message}`
          : "The task was created, but the note could not be deleted.",
      );
    } finally {
      setConvertTarget(null);
      router.push(taskPath(task));
    }
  }

  const projectConversionDraft = convertProjectTarget
    ? noteConversionProjectDraft(convertProjectTarget)
    : null;

  async function markConvertedProject(project: Project) {
    if (!convertProjectTarget) return;
    try {
      const updated = demoMode
        ? linkNoteToProject(convertProjectTarget, project)
        : (
            await mutate<{ note: Note }>("/api/notes", {
              method: "PATCH",
              body: JSON.stringify({
                id: convertProjectTarget.id,
                convertedProjectId: project.id,
              }),
            })
          ).note;
      setNotes((current) =>
        current.map((note) => (note.id === updated.id ? updated : note)),
      );
      toast.success("Note converted to a project.");
    } catch {
      toast.error(
        "The project was created, but the note could not be linked to it.",
      );
    } finally {
      setConvertProjectTarget(null);
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
        contentClassName="p-3 sm:p-6 lg:p-6 xl:p-8"
      >
        <Modal
          open
          setIsOpen={() => undefined}
          title="Notes"
          description="Catch quick thoughts before they escape. When an idea becomes real work, turn it into a task."
          actions={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() =>
                setNoteStatus(showArchived ? "active" : "archived")
              }
            >
              {showArchived ? "View active" : "View archive"}
            </Button>
          }
          hideActions
          size="xl"
          embedded
        >
          <section className="rounded-xl border border-black/10 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.025] sm:p-5">
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

          <section className="mt-6 border-t border-black/10 pt-5 dark:border-white/10">
            <div className="mb-4 flex items-center gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">
                {showArchived ? "Archived notes" : "Recent notes"}
              </h2>
            </div>

            {activeNotes.length ? (
              <div>
                <div
                  className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1 scroll-px-5"
                  aria-label="Filter notes by category"
                >
                  <FilterChip
                    active={noteCategoryParam === "all"}
                    className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap"
                    onClick={() => setNoteCategory("all")}
                  >
                    All
                    <CountBadge
                      className={
                        noteCategoryParam === "all"
                          ? "bg-white/20 text-white dark:bg-black/15 dark:text-black"
                          : undefined
                      }
                    >
                      {activeNotes.length}
                    </CountBadge>
                  </FilterChip>
                  {noteGroups.map((group) => {
                    const value = group.category?.name ?? "uncategorized";
                    const label = group.category?.name ?? "Uncategorized";
                    const active =
                      noteCategoryParam === value ||
                      noteCategoryParam === group.category?.id;
                    return (
                      <FilterChip
                        key={group.category?.id ?? "uncategorized"}
                        active={active}
                        className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap"
                        onClick={() => setNoteCategory(value)}
                      >
                        <i
                          className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15"
                          style={{
                            backgroundColor: group.category?.color ?? "#8a8a8a",
                          }}
                        />
                        {label}
                        <CountBadge
                          className={
                            active
                              ? "bg-white/20 text-white dark:bg-black/15 dark:text-black"
                              : undefined
                          }
                        >
                          {group.notes.length}
                        </CountBadge>
                      </FilterChip>
                    );
                  })}
                </div>

                {visibleNotes.length ? (
                  <div className="grid items-start gap-4 xl:grid-cols-3">
                    {visibleNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        category={
                          data.categories.find(
                            (category) => category.id === note.category_id,
                          ) ?? null
                        }
                        profiles={data.profiles}
                        demoMode={demoMode}
                        canConvertToProject={canConvertToProject}
                        onChange={(next) => void updateNote(next)}
                        onConvert={setConvertTarget}
                        onConvertToProject={setConvertProjectTarget}
                        onDelete={setDeleteTarget}
                        convertedTask={data.tasks.find(
                          (task) => task.id === note.converted_task_id,
                        )}
                        convertedProject={data.projects.find(
                          (project) => project.id === note.converted_project_id,
                        )}
                        comments={comments.filter(
                          (comment) => comment.note_id === note.id,
                        )}
                        currentProfileId={data.currentProfile.id}
                        onCommentsChange={(next) =>
                          setComments((current) => [
                            ...current.filter(
                              (comment) => comment.note_id !== note.id,
                            ),
                            ...next,
                          ])
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-black/15 px-6 py-10 text-center dark:border-white/15">
                    <FiFileText className="mx-auto text-2xl text-black/35 dark:text-white/35" />
                    <p className="mt-3 font-semibold">
                      No notes in this category
                    </p>
                    <button
                      type="button"
                      className="mt-2 text-sm font-semibold text-black/60 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:text-white/60 dark:focus-visible:ring-white/30"
                      onClick={() => setNoteCategory("all")}
                    >
                      View all notes
                    </button>
                  </div>
                )}
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
        </Modal>
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

      {convertProjectTarget && projectConversionDraft && (
        <ProjectsModal
          key={convertProjectTarget.id}
          modal={{
            open: true,
            setOpen: (open) => !open && setConvertProjectTarget(null),
          }}
          workspace={{ data, setData, demoMode }}
          options={{ createOnly: true, initialDraft: projectConversionDraft }}
          events={{ onCreated: markConvertedProject }}
        />
      )}
    </>
  );
}
