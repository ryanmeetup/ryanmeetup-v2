"use client";

import type { FormEvent } from "react";
import { Modal, ModalActions, Textarea } from "@ryanmeetup/ui";
import type { Status } from "@/lib/tasks/task-types";

const formId = "status-reason-form";

/**
 * Asked before a drag drops a task into a status that requires an explanation.
 * The editors ask for the same thing inline, on the form the person is already
 * filling in; a dragged card has no form, so it gets this.
 *
 * The reason is owned by the caller, which keeps a rejected move's wording on
 * screen instead of making someone type it a second time.
 */
export function StatusReasonDialog({
  status,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  pending,
}: {
  /** The status being moved into, or `null` while no move is waiting. */
  status: Status | null;
  reason: string;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim()) onConfirm();
  }

  return (
    <Modal
      open={Boolean(status)}
      setIsOpen={(next) => {
        if (!next && !pending) onCancel();
      }}
      title={status ? `Move to ${status.name}` : "Move task"}
      description="Saved as a comment on the task."
      maxWidth="36rem"
      actions={
        <ModalActions
          confirmForm={formId}
          confirmLabel="Move task"
          onCancel={onCancel}
          cancelDisabled={pending}
          confirmDisabled={!reason.trim()}
          pending={pending}
          pendingLabel="Moving..."
        />
      }
    >
      <form id={formId} onSubmit={submit}>
        <Textarea
          id="status-reason"
          name="status-reason"
          label="Reason"
          required
          autoFocus
          rows={4}
          maxLength={2000}
          disabled={pending}
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="What made this the right call?"
        />
      </form>
    </Modal>
  );
}
