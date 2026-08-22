import Link from "next/link";
import { FiBriefcase, FiCheck, FiExternalLink } from "react-icons/fi";
import { noteLinks, noteTitle } from "@/lib/resources/notes";
import { taskKey, taskPath } from "@/lib/tasks/task-key";
import type { Note, Project } from "@/lib/resources/resource-types";
import type { Task } from "@/lib/tasks/task-types";

const chipClassName =
  "relative inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-black/70 transition hover:border-black/20 hover:bg-black/5 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-white";

export function NoteLinks({
  note,
  convertedTask,
  convertedProject,
  className = "",
}: {
  note: Note;
  convertedTask?: Task;
  convertedProject?: Project;
  className?: string;
}) {
  const links = noteLinks(note);
  if (
    links.length === 0 &&
    !note.converted_task_id &&
    !note.converted_project_id
  )
    return null;

  return (
    <nav
      aria-label={`Links from “${noteTitle(note)}”`}
      className={`flex flex-wrap gap-2 ${className}`}
    >
      {note.converted_task_id && (
        <Link
          href={convertedTask ? taskPath(convertedTask) : "/board"}
          className={chipClassName}
        >
          <FiCheck aria-hidden className="shrink-0" />
          <span className="truncate">
            {convertedTask ? `Task ${taskKey(convertedTask)}` : "View task"}
          </span>
        </Link>
      )}
      {note.converted_project_id && (
        <Link
          href={
            convertedProject
              ? `/board?project=${encodeURIComponent(convertedProject.name)}`
              : "/projects"
          }
          className={chipClassName}
        >
          <FiBriefcase aria-hidden className="shrink-0" />
          <span className="truncate">
            {convertedProject ? convertedProject.name : "View project"}
          </span>
        </Link>
      )}
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={chipClassName}
        >
          <FiExternalLink aria-hidden className="shrink-0" />
          <span className="truncate">{link.label}</span>
        </a>
      ))}
    </nav>
  );
}
