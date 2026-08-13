import { Avatar, Button, IconButton, Textarea } from "@ryanmeetup/ui";
import { FiEdit2, FiMessageSquare, FiTrash2 } from "react-icons/fi";
import { CountBadge } from "@/components/global";
import { profileDisplayName } from "@/lib/presentation";
import type { Profile, TaskComment } from "@/lib/types";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function TaskCommentsPanel({
  comment,
  comments,
  currentProfileId,
  editingBody,
  editingComment,
  onCancelEdit,
  onClear,
  onCommentChange,
  onDelete,
  onEdit,
  onEditingBodyChange,
  onSave,
  onSubmit,
  previewing,
  profiles,
  saving,
}: {
  comment: string;
  comments: TaskComment[];
  currentProfileId: string;
  editingBody: string;
  editingComment: TaskComment | null;
  onCancelEdit: () => void;
  onClear: () => void;
  onCommentChange: (value: string) => void;
  onDelete: (comment: TaskComment) => void;
  onEdit: (comment: TaskComment) => void;
  onEditingBodyChange: (value: string) => void;
  onSave: () => void;
  onSubmit: () => void;
  previewing: boolean;
  profiles: Profile[];
  saving: boolean;
}) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
        <FiMessageSquare /> Comments <CountBadge>{comments.length}</CountBadge>
      </h3>
      {comments.length > 0 && (
        <div className="max-h-72 space-y-3 overflow-y-auto overscroll-contain pr-2">
          {comments.map((item) => {
            const profile = profiles.find(
              (entry) => entry.id === item.created_by,
            );
            const canManage =
              !previewing && item.created_by === currentProfileId;
            return (
              <div
                key={item.id}
                className="flex items-start gap-2 border-l-2 border-black/10 pl-3 text-sm dark:border-white/10"
              >
                <Avatar
                  name={profileDisplayName(profile)}
                  size="sm"
                  src={profile?.avatar_url}
                />
                <div className="min-w-0 flex-1">
                  {editingComment?.id === item.id ? (
                    <div className="space-y-2">
                      <Textarea
                        id={`edit-comment-${item.id}`}
                        label="Edit comment"
                        hideLabel
                        name={`edit-comment-${item.id}`}
                        value={editingBody}
                        onChange={(event) =>
                          onEditingBodyChange(event.target.value)
                        }
                        rows={2}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={saving}
                          onClick={onCancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          loading={saving}
                          disabled={!editingBody.trim()}
                          onClick={onSave}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="block">
                        <strong>{profileDisplayName(profile)}</strong>{" "}
                        {item.body}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5 text-xs text-black/45 dark:text-white/45">
                        <time>
                          {dateTimeFormatter.format(new Date(item.created_at))}
                        </time>
                        {item.edited_at && (
                          <span
                            aria-label={`Edited ${dateTimeFormatter.format(new Date(item.edited_at))}`}
                          >
                            · Edited
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </div>
                {canManage && editingComment?.id !== item.id && (
                  <span className="flex shrink-0 gap-1">
                    <IconButton
                      label="Edit comment"
                      onClick={() => onEdit(item)}
                    >
                      <FiEdit2 />
                    </IconButton>
                    <IconButton
                      label="Delete comment"
                      variant="danger"
                      onClick={() => onDelete(item)}
                    >
                      <FiTrash2 />
                    </IconButton>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Textarea
        id="task-comment"
        label="Comment"
        hideLabel
        name="task-comment"
        value={comment}
        onChange={(event) => onCommentChange(event.target.value)}
        placeholder="Add a comment…"
        rows={2}
      />
      <div className="grid w-full grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={!comment.trim()}
          onClick={onClear}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="action"
          className="w-full"
          disabled={!comment.trim()}
          onClick={onSubmit}
        >
          Comment
        </Button>
      </div>
    </section>
  );
}
