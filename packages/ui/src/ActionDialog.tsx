"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Input } from "./Input";
import { Modal } from "./Modal";
import { ModalActions } from "./ModalActions";

export type ConfirmationDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  pending?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
};

const ConfirmationDialog = ({
  open,
  setOpen,
  title,
  description,
  confirmLabel,
  pendingLabel,
  pending = false,
  destructive = false,
  onConfirm,
}: ConfirmationDialogProps) => (
  <Modal
    open={open}
    setIsOpen={setOpen}
    title={title}
    size="md"
    actions={
      <ModalActions
        confirmLabel={confirmLabel}
        destructive={destructive}
        onCancel={() => setOpen(false)}
        onConfirm={onConfirm}
        pending={pending}
        pendingLabel={pendingLabel}
      />
    }
  >
    {description && (
      <p className="text-sm leading-relaxed text-black/65 dark:text-white/65">
        {description}
      </p>
    )}
  </Modal>
);

export type PromptDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: ReactNode;
  label: string;
  initialValue?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  onConfirm: (value: string) => void;
};

const PromptDialog = ({
  open,
  setOpen,
  title,
  label,
  initialValue = "",
  confirmLabel = "Save",
  pendingLabel,
  pending = false,
  onConfirm,
}: PromptDialogProps) => {
  const formId = "prompt-dialog-form";
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [initialValue, open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextValue = value.trim();
    if (nextValue) onConfirm(nextValue);
  }

  return (
    <Modal
      open={open}
      setIsOpen={setOpen}
      title={title}
      size="sm"
      actions={
        <ModalActions
          confirmForm={formId}
          confirmLabel={confirmLabel}
          onCancel={() => setOpen(false)}
          pending={pending}
          pendingLabel={pendingLabel}
        />
      }
    >
      <form id={formId} onSubmit={submit}>
        <Input
          label={label}
          name="dialog-value"
          value={value}
          autoFocus
          required
          disabled={pending}
          onChange={(event) => setValue(event.target.value)}
        />
      </form>
    </Modal>
  );
};

export { ConfirmationDialog, PromptDialog };
