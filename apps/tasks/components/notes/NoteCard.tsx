"use client";

import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuButton,
  DropdownMenuItem,
  DropdownMenuItems,
  IconButton,
  Input,
  Textarea,
  toast,
} from "@ryanmeetup/ui";
import {
  FiArchive,
  FiBriefcase,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiFileText,
  FiRotateCcw,
  FiTrash2,
} from "react-icons/fi";
import { noteTitle } from "@/lib/notes";
import { taskPath } from "@/lib/task-key";
import type { Note, NoteComment, Project } from "@/lib/resource-types";
import type { Task } from "@/lib/task-types";
import type { WorkspaceData } from "@/lib/workspace-types";
import { useNoteDraft } from "./useNoteDraft";
import { NoteComments } from "./NoteComments";

export function NoteCard({
  note,
  profiles,
  demoMode,
  canConvertToProject,
  onChange,
  onConvert,
  onConvertToProject,
  onDelete,
  convertedTask,
  convertedProject,
  comments,
  currentProfileId,
  onCommentsChange,
}: {
  note: Note;
  profiles: WorkspaceData["profiles"];
  demoMode: boolean;
  canConvertToProject: boolean;
  onChange: (note: Note) => void;
  onConvert: (note: Note) => void;
  onConvertToProject: (note: Note) => void;
  onDelete: (note: Note) => void;
  convertedTask?: Task;
  convertedProject?: Project;
  comments: NoteComment[];
  currentProfileId: string;
  onCommentsChange: (comments: NoteComment[]) => void;
}) {
  const draft = useNoteDraft(note, demoMode, (updated) => {
    onChange(updated);
    toast.success("Note saved.");
  });
  const author = profiles.find((profile) => profile.id === note.created_by);
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
            value={draft.title}
            maxLength={200}
            disabled={Boolean(note.archived_at)}
            onChange={(event) => draft.setTitle(event.target.value)}
          />
          <Textarea
            id={`note-body-${note.id}`}
            label="Note text"
            name={`note-body-${note.id}`}
            hideLabel
            value={draft.body}
            rows={4}
            maxLength={10000}
            disabled={Boolean(note.archived_at)}
            onChange={(event) => draft.setBody(event.target.value)}
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
            <time
              dateTime={note.updated_at}
              className="inline-flex items-center gap-1.5"
            >
              <FiClock className="shrink-0" aria-hidden />
              Updated {new Date(note.updated_at).toLocaleString()}
            </time>
            <span className="ml-auto" role="status">
              {draft.saveState === "saving" && "Saving…"}
              {draft.saveState === "saved" && "Saved"}
              {draft.saveState === "error" && "Not saved"}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <IconButton
            label={
              note.archived_at
                ? `Restore “${noteTitle(note)}”`
                : `Archive “${noteTitle(note)}”`
            }
            variant="archive"
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
        <div className="ml-auto flex items-center gap-2">
          {note.converted_task_id && (
            <Button.Link
              href={convertedTask ? taskPath(convertedTask) : "/board"}
              size="sm"
              variant="secondary"
              leftIcon={<FiCheck />}
            >
              View task
            </Button.Link>
          )}
          {note.converted_project_id && (
            <Button.Link
              href={
                convertedProject
                  ? `/board?project=${encodeURIComponent(convertedProject.name)}`
                  : "/projects"
              }
              size="sm"
              variant="secondary"
              leftIcon={<FiBriefcase />}
            >
              View project
            </Button.Link>
          )}
          {!note.converted_task_id &&
            !note.converted_project_id &&
            !note.archived_at &&
            (canConvertToProject ? (
              <DropdownMenu>
                <DropdownMenuButton
                  unstyled
                  className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30"
                >
                  Convert
                  <FiChevronDown aria-hidden />
                </DropdownMenuButton>
                <DropdownMenuItems align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      onConvert({
                        ...note,
                        title: draft.title.trim() || null,
                        body: draft.body,
                      })
                    }
                  >
                    <FiCheck aria-hidden /> Convert to task
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      onConvertToProject({
                        ...note,
                        title: draft.title.trim() || null,
                        body: draft.body,
                      })
                    }
                  >
                    <FiBriefcase aria-hidden /> Convert to project
                  </DropdownMenuItem>
                </DropdownMenuItems>
              </DropdownMenu>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  onConvert({
                    ...note,
                    title: draft.title.trim() || null,
                    body: draft.body,
                  })
                }
              >
                Convert to task
              </Button>
            ))}
        </div>
      </div>
      <NoteComments
        noteId={note.id}
        comments={comments}
        currentProfileId={currentProfileId}
        profiles={profiles}
        demoMode={demoMode}
        onChange={onCommentsChange}
      />
    </article>
  );
}
