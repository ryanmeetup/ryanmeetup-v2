"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { MdClose as Close } from "react-icons/md";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { IconButton } from "./IconButton";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

export type ModalProps = {
  open: boolean;
  setIsOpen: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  closable?: boolean;
  actions?: ReactNode;
  panelClassName?: string;
  maxHeight?: string;
  primaryActionFirst?: boolean;
  reverseActionsOnDesktop?: boolean;
  hideActions?: boolean;
  cancelButtonText?: string;
  continueButtonText?: string;
  isContinueDisabled?: boolean;
  cancelAction?: () => void;
  continueAction?: () => void;
  size?: ModalSize;
};

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
  "2xl": "max-w-7xl",
  full: "max-w-[calc(100vw-2rem)]",
};

const Modal = ({
  open,
  setIsOpen,
  title,
  children,
  closable = true,
  actions,
  panelClassName,
  maxHeight,
  primaryActionFirst = false,
  reverseActionsOnDesktop = false,
  hideActions = false,
  cancelButtonText,
  continueButtonText,
  isContinueDisabled = false,
  cancelAction,
  continueAction,
  size = "md",
}: ModalProps) => {
  const legacyActions =
    cancelButtonText && continueButtonText && cancelAction && continueAction ? (
      <div
        className={`mt-6 flex flex-col gap-3 sm:justify-end ${reverseActionsOnDesktop ? "sm:flex-row-reverse" : "sm:flex-row"}`}
      >
        {primaryActionFirst ? (
          <>
            <Button
              variant="primary"
              className="w-full sm:w-auto"
              disabled={isContinueDisabled}
              onClick={continueAction}
            >
              {continueButtonText}
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={cancelAction}
            >
              {cancelButtonText}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={cancelAction}
            >
              {cancelButtonText}
            </Button>
            <Button
              variant="primary"
              className="w-full sm:w-auto"
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
        className="fixed inset-0 bg-black/65 backdrop-blur-sm dark:bg-black/80"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex w-screen items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <DialogPanel
          style={{
            maxHeight:
              maxHeight ??
              "calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom)))",
          }}
          className={`mx-auto flex w-full min-h-0 flex-col ${sizeStyles[size]} rounded-2xl border border-black/15 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/5 dark:border-white/20 dark:bg-[#181818] dark:shadow-[0_28px_100px_rgba(0,0,0,0.85)] dark:ring-white/10 ${panelClassName ?? ""}`}
        >
          <div className="mb-4 flex w-full items-start justify-between gap-4">
            <DialogTitle className="text-xl font-cooper capitalize text-black md:text-2xl dark:text-white">
              {title}
            </DialogTitle>
            {closable && (
              <IconButton label="Close dialog" onClick={() => setIsOpen(false)}>
                <Close className="h-5 w-5" />
              </IconButton>
            )}
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            {children}
            {!hideActions &&
              (actions ? (
                <div className="mt-6 flex justify-end">{actions}</div>
              ) : (
                legacyActions
              ))}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export { Modal };
