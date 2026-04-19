"use client";

// Components
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { MdClose as Close } from "react-icons/md";
import { Button } from "@/components/global";

// Types
import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  setIsOpen: (open: boolean) => void;
  title: string;
  closable: boolean;
  children: ReactNode;
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
    cancelButtonText,
    continueButtonText,
    isContinueDisabled,
    cancelAction,
    continueAction,
  } = props;

  return (
    <Dialog open={open} onClose={() => setIsOpen(false)} className="relative z-50">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4 w-screen">
        <DialogPanel className="mx-auto w-full max-w-lg rounded-2xl border border-black/10 bg-white/95 p-6 shadow-2xl dark:border-white/15 dark:bg-black/85">
          <div className="flex justify-between w-full mb-4 items-start gap-4">
            <DialogTitle className="text-xl font-cooper text-black md:text-2xl dark:text-white">
              {title}
            </DialogTitle>

            {closable && (
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-black transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/10 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30"
                onClick={() => setIsOpen(false)}
              >
                <Close className="h-5 w-5" />
              </button>
            )}
          </div>

          <div>
            {children}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export { Modal };
