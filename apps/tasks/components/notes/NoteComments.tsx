"use client";

import { useState } from "react";
import { Avatar, Button, IconButton, Textarea, toast } from "@ryanmeetup/ui";
import { FiEdit2, FiMessageSquare, FiTrash2 } from "react-icons/fi";
import { CountBadge } from "@/components/global";
import { mutate } from "@/lib/mutation-client";
import { profileDisplayName } from "@/lib/presentation";
import type { NoteComment } from "@/lib/resource-types";
import type { Profile } from "@/lib/workspace-types";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function NoteComments({
  noteId,
  comments,
  currentProfileId,
  profiles,
  demoMode,
  onChange,
}: {
  noteId: string;
  comments: NoteComment[];
  currentProfileId: string;
  profiles: Profile[];
  demoMode: boolean;
  onChange: (comments: NoteComment[]) => void;
}) {
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<NoteComment | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function addComment() {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const comment: NoteComment = demoMode
        ? {
            id: crypto.randomUUID(),
            note_id: noteId,
            body: body.trim(),
            created_by: currentProfileId,
            created_at: new Date().toISOString(),
            edited_at: null,
          }
        : (
            await mutate<{ comment: NoteComment }>("/api/note-comments", {
              method: "POST",
              body: JSON.stringify({ noteId, body }),
            })
          ).comment;
      onChange([...comments, comment]);
      setBody("");
      toast.success("Comment added.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The comment could not be added.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveComment() {
    if (!editing || !editingBody.trim()) return;
    setSaving(true);
    try {
      const comment: NoteComment = demoMode
        ? {
            ...editing,
            body: editingBody.trim(),
            edited_at: new Date().toISOString(),
          }
        : (
            await mutate<{ comment: NoteComment }>("/api/note-comments", {
              method: "PATCH",
              body: JSON.stringify({ id: editing.id, body: editingBody }),
            })
          ).comment;
      onChange(
        comments.map((item) => (item.id === comment.id ? comment : item)),
      );
      setEditing(null);
      setEditingBody("");
      toast.success("Comment updated.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The comment could not be updated.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteComment(comment: NoteComment) {
    setSaving(true);
    try {
      if (!demoMode)
        await mutate("/api/note-comments", {
          method: "DELETE",
          body: JSON.stringify({ id: comment.id }),
        });
      onChange(comments.filter((item) => item.id !== comment.id));
      toast.success("Comment deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The comment could not be deleted.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 space-y-3 border-t border-black/10 pt-4 dark:border-white/10">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
        <FiMessageSquare aria-hidden /> Comments{" "}
        <CountBadge>{comments.length}</CountBadge>
      </h3>
      {comments.length > 0 && (
        <div className="max-h-72 space-y-3 overflow-y-auto overscroll-contain pr-2">
          {comments.map((comment) => {
            const profile = profiles.find(
              (item) => item.id === comment.created_by,
            );
            const author = profileDisplayName(profile);
            return (
              <article
                key={comment.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 text-sm"
              >
                <Avatar name={author} src={profile?.avatar_url} size="sm" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <strong className="font-semibold">{author}</strong>
                    <time
                      className="text-xs text-black/45 dark:text-white/45"
                      dateTime={comment.created_at}
                    >
                      {dateTimeFormatter.format(new Date(comment.created_at))}
                      {comment.edited_at ? " · Edited" : ""}
                    </time>
                  </div>
                  {editing?.id === comment.id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        id={`edit-note-comment-${comment.id}`}
                        label="Edit comment"
                        hideLabel
                        name={`edit-note-comment-${comment.id}`}
                        value={editingBody}
                        maxLength={5000}
                        rows={2}
                        onChange={(event) => setEditingBody(event.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={saving}
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          loading={saving}
                          disabled={!editingBody.trim()}
                          onClick={() => void saveComment()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-black/80 dark:text-white/80">
                      {comment.body}
                    </p>
                  )}
                </div>
                {comment.created_by === currentProfileId &&
                  editing?.id !== comment.id && (
                    <span className="flex gap-1">
                      <IconButton
                        label={`Edit comment by ${author}`}
                        variant="edit"
                        onClick={() => {
                          setEditing(comment);
                          setEditingBody(comment.body);
                        }}
                      >
                        <FiEdit2 />
                      </IconButton>
                      <IconButton
                        label={`Delete comment by ${author}`}
                        variant="danger"
                        disabled={saving}
                        onClick={() => void deleteComment(comment)}
                      >
                        <FiTrash2 />
                      </IconButton>
                    </span>
                  )}
              </article>
            );
          })}
        </div>
      )}
      <Textarea
        id={`note-comment-${noteId}`}
        label="Comment"
        hideLabel
        name={`note-comment-${noteId}`}
        value={body}
        maxLength={5000}
        rows={2}
        placeholder="Add a comment…"
        onChange={(event) => setBody(event.target.value)}
      />
      <Button
        type="button"
        variant="action"
        className="w-full sm:w-auto"
        loading={saving && !editing}
        disabled={saving || !body.trim()}
        onClick={() => void addComment()}
      >
        Comment
      </Button>
    </section>
  );
}
