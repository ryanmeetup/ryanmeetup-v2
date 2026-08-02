"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "./Button";
import { Input } from "./Input";
import { Modal } from "./Modal";

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
  <Modal open={open} setIsOpen={setOpen} title={title} hideActions size="sm">
    {description && (
      <p className="text-sm leading-relaxed text-black/65 dark:text-white/65">
        {description}
      </p>
    )}
    <div className="mt-6 flex justify-end gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant={destructive ? "danger" : "primary"}
        loading={pending}
        loadingText={pendingLabel ?? `${confirmLabel}...`}
        onClick={onConfirm}
      >
        {confirmLabel}
      </Button>
    </div>
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
    <Modal open={open} setIsOpen={setOpen} title={title} hideActions size="sm">
      <form className="space-y-5" onSubmit={submit}>
        <Input
          label={label}
          name="dialog-value"
          value={value}
          autoFocus
          required
          disabled={pending}
          onChange={(event) => setValue(event.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={pending}
            loadingText={pendingLabel ?? `${confirmLabel}...`}
          >
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { ConfirmationDialog, PromptDialog };
