"use client";

// Components
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { MdClose as Close } from "react-icons/md";
import { Button } from "@/components/global";
import { IconButton } from "./IconButton";

// Types
import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  setIsOpen: (open: boolean) => void;
  title: string;
  closable: boolean;
  children: ReactNode;
  hideActions?: boolean;
  panelClassName?: string;
  primaryActionFirst?: boolean;
  reverseActionsOnDesktop?: boolean;
  cancelButtonText: string;
  continueButtonText: string;
  isContinueDisabled: boolean;
  cancelAction: () => void;
  continueAction: () => void;
};

const Modal = (props: ModalProps) => {
  const {
    open,
    setIsOpen,
    title,
    closable,
    children,
    hideActions = false,
    panelClassName,
    primaryActionFirst = false,
    reverseActionsOnDesktop = false,
    cancelButtonText,
    continueButtonText,
    isContinueDisabled,
    cancelAction,
    continueAction,
  } = props;

  const primaryAction = (
    <Button
      variant="primary"
      fullWidth
      disabled={isContinueDisabled}
      onClick={continueAction}
    >
      {continueButtonText}
    </Button>
  );
  const secondaryAction = (
    <Button variant="secondary" fullWidth onClick={cancelAction}>
      {cancelButtonText}
    </Button>
  );

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

      <div className="fixed inset-0 flex items-center justify-center p-4 w-screen">
        <DialogPanel
          className={[
            "mx-auto w-full max-w-lg rounded-2xl border border-black/10 bg-white/95 p-6 shadow-2xl dark:border-white/15 dark:bg-black/85",
            panelClassName ?? "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="flex justify-between w-full mb-4 items-start gap-4">
            <DialogTitle className="text-xl font-cooper text-black md:text-2xl dark:text-white">
              {title}
            </DialogTitle>

            {closable && (
              <IconButton label="Close dialog" onClick={() => setIsOpen(false)}>
                <Close className="h-5 w-5" />
              </IconButton>
            )}
          </div>

          <div>
            {children}

            {!hideActions && (
              <div
                className={`mt-6 flex flex-col gap-3 ${
                  reverseActionsOnDesktop
                    ? "sm:flex-row-reverse"
                    : "sm:flex-row"
                }`}
              >
                {primaryActionFirst ? primaryAction : secondaryAction}
                {primaryActionFirst ? secondaryAction : primaryAction}
              </div>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export { Modal };
