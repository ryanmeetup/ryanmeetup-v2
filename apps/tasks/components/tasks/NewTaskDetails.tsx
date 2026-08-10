"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  Button,
  DisclosureCard,
  IconButton,
  Input,
  Textarea,
  toast,
} from "@ryanmeetup/ui";
import {
  FiActivity,
  FiFile,
  FiMessageSquare,
  FiPaperclip,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { MAX_ATTACHMENT_SIZE } from "@/lib/task-attachments";

export type NewTaskDetailsDraft = {
  checklist: { id: string; title: string }[];
  files: File[];
  comment: string;
};

export const emptyNewTaskDetails = (): NewTaskDetailsDraft => ({
  checklist: [],
  files: [],
  comment: "",
});

function formatSize(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function NewTaskDetails({
  value,
  onChange,
  disabled,
}: {
  value: NewTaskDetailsDraft;
  onChange: Dispatch<SetStateAction<NewTaskDetailsDraft>>;
  disabled: boolean;
}) {
  const [checklistTitle, setChecklistTitle] = useState("");
  const [draggingFiles, setDraggingFiles] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function addChecklistItem() {
    const title = checklistTitle.trim();
    if (!title) return;
    onChange((current) => ({
      ...current,
      checklist: [...current.checklist, { id: crypto.randomUUID(), title }],
    }));
    setChecklistTitle("");
  }

  function addFiles(files: File[]) {
    const accepted = files.filter((file) => {
      if (file.size > 0 && file.size <= MAX_ATTACHMENT_SIZE) return true;
      toast.error(`${file.name} must be between 1 byte and 10 MB.`);
      return false;
    });
    onChange((current) => ({
      ...current,
      files: [...current.files, ...accepted],
    }));
  }

  return (
    <div className="space-y-6">
      <DisclosureCard
        defaultOpen
        className=""
        buttonClassName="flex w-full items-center justify-between gap-3 py-1 text-left"
        panelClassName="space-y-3 pt-3"
        iconClassName="h-3.5 w-3.5"
        summary={
          <span className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Checklist
            </span>
            <span className="text-xs text-black/50 dark:text-white/50">
              0/{value.checklist.length}
            </span>
          </span>
        }
      >
        {value.checklist.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="h-5 w-5 shrink-0 rounded border border-black/20 dark:border-white/25" />
            <span className="min-w-0 flex-1 text-sm">{item.title}</span>
            <IconButton
              type="button"
              label={`Remove ${item.title}`}
              variant="danger"
              disabled={disabled}
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  checklist: current.checklist.filter(
                    (candidate) => candidate.id !== item.id,
                  ),
                }))
              }
            >
              <FiTrash2 />
            </IconButton>
          </div>
        ))}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Input
            label="Checklist item"
            name="new-task-checklist-item"
            hideLabel
            value={checklistTitle}
            placeholder="Add a checklist item..."
            disabled={disabled}
            onChange={(event) => setChecklistTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              addChecklistItem();
            }}
          />
          <Button
            type="button"
            variant="action"
            leftIcon={<FiPlus aria-hidden />}
            disabled={disabled || !checklistTitle.trim()}
            onClick={addChecklistItem}
          >
            Add
          </Button>
        </div>
      </DisclosureCard>

      <section className="space-y-3 border-t border-black/10 pt-5 dark:border-white/10">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
          <FiPaperclip aria-hidden /> Attachments
          {value.files.length > 0 && (
            <span className="rounded-full bg-black/10 px-2 py-0.5 tracking-normal text-black/60 dark:bg-white/10 dark:text-white/60">
              {value.files.length}
            </span>
          )}
        </h3>
        {value.files.map((file, index) => (
          <div
            key={`${file.name}-${file.size}-${index}`}
            className="flex items-center gap-3 rounded-xl border border-black/10 p-2 dark:border-white/10"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/5 text-black/55 dark:bg-white/5 dark:text-white/55">
              <FiFile aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{file.name}</p>
              <p className="text-xs text-black/50 dark:text-white/50">
                {formatSize(file.size)}
              </p>
            </div>
            <IconButton
              type="button"
              label={`Remove ${file.name}`}
              variant="danger"
              disabled={disabled}
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  files: current.files.filter(
                    (_, fileIndex) => fileIndex !== index,
                  ),
                }))
              }
            >
              <FiTrash2 />
            </IconButton>
          </div>
        ))}
        <div
          className={`rounded-xl border border-dashed p-4 text-center transition duration-200 ease-in-out ${draggingFiles ? "border-black/50 bg-black/5 ring-2 ring-black/10 dark:border-white/60 dark:bg-white/10 dark:ring-white/15" : "border-black/20 bg-black/[0.02] dark:border-white/20 dark:bg-white/[0.03]"}`}
          onDragEnter={(event) => {
            event.preventDefault();
            if (event.dataTransfer.types.includes("Files"))
              setDraggingFiles(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(event) => {
            const target = event.relatedTarget;
            if (
              !(target instanceof Node) ||
              !event.currentTarget.contains(target)
            )
              setDraggingFiles(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDraggingFiles(false);
            addFiles(Array.from(event.dataTransfer.files));
          }}
        >
          <FiPaperclip className="mx-auto mb-2 h-5 w-5 text-black/45 dark:text-white/45" />
          <p className="text-sm font-semibold">Drop files here</p>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Multiple files supported · 10 MB maximum per file
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            disabled={disabled}
            onClick={() => fileInput.current?.click()}
          >
            Choose files
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          multiple
          aria-label="Add files to the new task"
          accept=".pdf,.txt,image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </section>

      <section className="space-y-3 border-t border-black/10 pt-5 dark:border-white/10">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
          <FiMessageSquare aria-hidden /> Comments
          <span className="rounded-full bg-black/10 px-2 py-0.5 tracking-normal text-black/60 dark:bg-white/10 dark:text-white/60">
            {value.comment.trim() ? 1 : 0}
          </span>
        </h3>
        <Textarea
          id="new-task-initial-comment"
          label="Comment"
          name="new-task-initial-comment"
          hideLabel
          value={value.comment}
          placeholder="Add a comment..."
          rows={4}
          maxLength={10000}
          disabled={disabled}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              comment: event.target.value,
            }))
          }
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || !value.comment}
            onClick={() => onChange((current) => ({ ...current, comment: "" }))}
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="action"
            disabled={disabled || !value.comment.trim()}
            onClick={() => toast.success("Comment queued for the new task.")}
          >
            Comment
          </Button>
        </div>
      </section>

      <DisclosureCard
        className="border-t border-black/10 pt-5 dark:border-white/10"
        buttonClassName="flex w-full items-center justify-between gap-3 py-1 text-left"
        panelClassName="pt-3"
        iconClassName="h-3.5 w-3.5"
        summary={
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
            <FiActivity aria-hidden /> Activity
            <span className="rounded-full bg-black/10 px-2 py-0.5 tracking-normal text-black/60 dark:bg-white/10 dark:text-white/60">
              0
            </span>
          </span>
        }
      >
        <p className="text-sm text-black/55 dark:text-white/55">
          Activity will begin when the task is created.
        </p>
      </DisclosureCard>
    </div>
  );
}
