"use client";

import type { ReactNode } from "react";
import { Button } from "./Button";
import type { ButtonSize } from "./Button";
import { Tooltip } from "./Tooltip";

export type ModalActionsProps = {
  /** Label for the dismissing action. Omit `onCancel` to render confirm alone. */
  cancelLabel?: string;
  onCancel?: () => void;
  /** Defaults to `pending`; raise it when other work also blocks dismissal. */
  cancelDisabled?: boolean;
  confirmLabel: string;
  /** Binds confirm to a form by id; without it confirm is a plain button. */
  confirmForm?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  confirmIcon?: ReactNode;
  /** Shown on hover/focus while the confirm is disabled, to explain why. */
  confirmTooltip?: ReactNode;
  destructive?: boolean;
  pending?: boolean;
  /** Defaults to `${confirmLabel}...` while pending. */
  pendingLabel?: string;
  size?: ButtonSize;
};

/**
 * The standard modal footer pair: dismiss on the left of the group, commit on
 * the right. Always pass this through `Modal`'s `actions` prop so the group
 * lands on the right edge of the footer; anything that belongs on the far left
 * (delete, secondary escapes) goes through `supportingActions` instead.
 */
const ModalActions = ({
  cancelLabel = "Cancel",
  onCancel,
  cancelDisabled,
  confirmLabel,
  confirmForm,
  onConfirm,
  confirmDisabled = false,
  confirmIcon,
  confirmTooltip,
  destructive = false,
  pending = false,
  pendingLabel,
  size = "sm",
}: ModalActionsProps) => {
  const confirm = (
    <Button
      type={confirmForm ? "submit" : "button"}
      form={confirmForm}
      variant={destructive ? "danger" : "primary"}
      size={size}
      leftIcon={confirmIcon}
      loading={pending}
      loadingText={pendingLabel ?? `${confirmLabel}...`}
      disabled={confirmDisabled}
      onClick={onConfirm}
    >
      {confirmLabel}
    </Button>
  );

  return (
    <>
      {onCancel && (
        <Button
          type="button"
          variant="secondary"
          size={size}
          disabled={cancelDisabled ?? pending}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
      )}
      {confirmTooltip ? (
        <Tooltip content={confirmTooltip} disabled={!confirmDisabled}>
          <span tabIndex={confirmDisabled ? 0 : -1}>{confirm}</span>
        </Tooltip>
      ) : (
        confirm
      )}
    </>
  );
};

export { ModalActions };
