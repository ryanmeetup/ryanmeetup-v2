"use client";

import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuButton,
  DropdownMenuItem,
  DropdownMenuItems,
  FormattedText,
  IconButton,
} from "@ryanmeetup/ui";
import {
  FiArchive,
  FiBriefcase,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiEdit2,
  FiFileText,
  FiMessageSquare,
  FiRotateCcw,
  FiTrash2,
} from "react-icons/fi";
import { CountBadge } from "@/components/global";
import { noteTitle } from "@/lib/resources/notes";
import type { Category, Note, Project } from "@/lib/resources/resource-types";
import type { Task } from "@/lib/tasks/task-types";
import type { WorkspaceData } from "@/lib/workspace/workspace-types";
import { NoteLinks } from "./NoteLinks";

export function NoteCard({
  note,
  category,
  profiles,
  previewing,
  canConvertToProject,
  commentCount,
  convertedTask,
  convertedProject,
  onOpen,
  onEdit,
  onArchive,
  onConvert,
  onConvertToProject,
  onDelete,
}: {
  note: Note;
  category: Category | null;
  profiles: WorkspaceData["profiles"];
  previewing: boolean;
  canConvertToProject: boolean;
  commentCount: number;
  convertedTask?: Task;
  convertedProject?: Project;
  onOpen: (note: Note) => void;
  onEdit: (note: Note) => void;
  onArchive: (note: Note) => void;
  onConvert: (note: Note) => void;
  onConvertToProject: (note: Note) => void;
  onDelete: (note: Note) => void;
}) {
  const author = profiles.find((profile) => profile.id === note.created_by);
  const title = noteTitle(note);
  const archived = Boolean(note.archived_at);
  return (
    <article className="relative flex flex-col rounded-2xl border border-black/10 bg-black/[0.015] p-4 transition hover:border-black/20 dark:border-white/10 dark:bg-white/[0.025] dark:hover:border-white/20 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black/5 text-black/55 dark:bg-white/10 dark:text-white/60">
          <FiFileText aria-hidden />
        </span>
        <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug">
          <button
            type="button"
            className="text-left after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30"
            onClick={() => onOpen(note)}
          >
            {title}
          </button>
        </h3>
        <span className="inline-flex min-w-0 max-w-[45%] shrink-0 items-center gap-2 rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/65 dark:border-white/10 dark:bg-white/5 dark:text-white/65">
          <i
            className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15"
            style={{ backgroundColor: category?.color ?? "#8a8a8a" }}
          />
          <span className="truncate">{category?.name ?? "Uncategorized"}</span>
        </span>
      </div>

      <FormattedText
        text={note.body}
        className="mt-3 line-clamp-6 min-w-0 break-words text-sm leading-6 text-black/75 dark:text-white/75"
      />

      <NoteLinks
        note={note}
        convertedTask={convertedTask}
        convertedProject={convertedProject}
        className="mt-3"
      />

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-black/50 dark:text-white/50">
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
        <span className="inline-flex items-center gap-1.5">
          <FiMessageSquare className="shrink-0" aria-hidden />
          <span className="sr-only">Comments</span>
          <CountBadge>{commentCount}</CountBadge>
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-3 dark:border-white/10">
        <div className="relative flex items-center gap-2">
          {!previewing && (
            <>
              {!archived && (
                <IconButton
                  label={`Edit “${title}”`}
                  variant="edit"
                  onClick={() => onEdit(note)}
                >
                  <FiEdit2 />
                </IconButton>
              )}
              <IconButton
                label={archived ? `Restore “${title}”` : `Archive “${title}”`}
                variant="archive"
                onClick={() => onArchive(note)}
              >
                {archived ? <FiRotateCcw /> : <FiArchive />}
              </IconButton>
              <IconButton
                label={`Delete “${title}”`}
                variant="danger"
                onClick={() => onDelete(note)}
              >
                <FiTrash2 />
              </IconButton>
            </>
          )}
        </div>
        <div className="relative ml-auto flex items-center gap-2">
          {!previewing &&
            !note.converted_task_id &&
            !note.converted_project_id &&
            !archived &&
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
                  <DropdownMenuItem onClick={() => onConvert(note)}>
                    <FiCheck aria-hidden /> Convert to task
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onConvertToProject(note)}>
                    <FiBriefcase aria-hidden /> Convert to project
                  </DropdownMenuItem>
                </DropdownMenuItems>
              </DropdownMenu>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onConvert(note)}
              >
                Convert to task
              </Button>
            ))}
        </div>
      </div>
    </article>
  );
}
