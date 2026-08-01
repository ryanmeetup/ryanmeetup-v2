"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { MdClose as Close } from "react-icons/md";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { IconButton } from "./IconButton";

export type ModalProps = {
  open: boolean;
  setIsOpen: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  closable?: boolean;
  actions?: ReactNode;
  panelClassName?: string;
  primaryActionFirst?: boolean;
  reverseActionsOnDesktop?: boolean;
  hideActions?: boolean;
  cancelButtonText?: string;
  continueButtonText?: string;
  isContinueDisabled?: boolean;
  cancelAction?: () => void;
  continueAction?: () => void;
};

const Modal = ({
  open,
  setIsOpen,
  title,
  children,
  closable = true,
  actions,
  panelClassName,
  primaryActionFirst = false,
  reverseActionsOnDesktop = false,
  hideActions = false,
  cancelButtonText,
  continueButtonText,
  isContinueDisabled = false,
  cancelAction,
  continueAction,
}: ModalProps) => {
  const legacyActions =
    cancelButtonText && continueButtonText && cancelAction && continueAction ? (
      <div
        className={`mt-6 flex flex-col gap-3 ${reverseActionsOnDesktop ? "sm:flex-row-reverse" : "sm:flex-row"}`}
      >
        {primaryActionFirst ? (
          <>
            <Button
              variant="primary"
              fullWidth
              disabled={isContinueDisabled}
              onClick={continueAction}
            >
              {continueButtonText}
            </Button>
            <Button variant="secondary" fullWidth onClick={cancelAction}>
              {cancelButtonText}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" fullWidth onClick={cancelAction}>
              {cancelButtonText}
            </Button>
            <Button
              variant="primary"
              fullWidth
              disabled={isContinueDisabled}
              onClick={continueAction}
            >
              {continueButtonText}
            </Button>
          </>
        )}
      </div>
    ) : null;

  return (
    <Dialog
      open={open}
      onClose={() => setIsOpen(false)}
      className="relative z-50"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel
          className={`mx-auto w-full max-w-lg rounded-2xl border border-black/10 bg-white/95 p-6 shadow-2xl dark:border-white/15 dark:bg-black/85 ${panelClassName ?? ""}`}
        >
          <div className="mb-4 flex w-full items-start justify-between gap-4">
            <DialogTitle className="text-xl font-cooper text-black md:text-2xl dark:text-white">
              {title}
            </DialogTitle>
            {closable && (
              <IconButton label="Close dialog" onClick={() => setIsOpen(false)}>
                <Close className="h-5 w-5" />
              </IconButton>
            )}
          </div>
          {children}
          {!hideActions &&
            (actions ? <div className="mt-6">{actions}</div> : legacyActions)}
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export { Modal };
