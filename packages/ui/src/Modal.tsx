"use client";

import {
  Dialog,
  DialogDescription,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { MdClose as Close, MdKeyboardArrowDown } from "react-icons/md";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEventHandler, ReactNode } from "react";
import { Button } from "./Button";
import { Heading } from "./Heading";
import { IconButton } from "./IconButton";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

export type ModalProps = {
  open: boolean;
  setIsOpen: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  closable?: boolean;
  actions?: ReactNode;
  footer?: ReactNode;
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
  embedded?: boolean;
  formId?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
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
  description,
  children,
  closable = true,
  actions,
  footer,
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
  embedded = false,
  formId,
  onSubmit,
}: ModalProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    canScrollUp: false,
    canScrollDown: false,
  });

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;

    if (!container) return;

    const scrollBuffer = 2;
    setScrollState({
      canScrollUp: container.scrollTop > scrollBuffer,
      canScrollDown:
        container.scrollTop + container.clientHeight <
        container.scrollHeight - scrollBuffer,
    });
  }, []);

  useEffect(() => {
    if (!open || embedded) return;

    const container = scrollContainerRef.current;
    const content = scrollContentRef.current;

    if (!container || !content) return;

    updateScrollState();

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);
    resizeObserver.observe(content);

    return () => resizeObserver.disconnect();
  }, [embedded, open, updateScrollState]);

  const legacyActions =
    cancelButtonText && continueButtonText && cancelAction && continueAction ? (
      <div
        className={`flex flex-col gap-3 sm:justify-end ${reverseActionsOnDesktop ? "sm:flex-row-reverse" : "sm:flex-row"}`}
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

  if (embedded) {
    return (
      <section
        className={`overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#181818] ${panelClassName ?? ""}`}
      >
        {title && (
          <div className="flex flex-col gap-4 border-b border-black/10 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Heading size="h1" className="text-2xl sm:text-3xl">
                {title}
              </Heading>
              {description && (
                <div className="mt-2 text-sm leading-relaxed text-black/65 dark:text-white/65">
                  {description}
                </div>
              )}
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
          </div>
        )}
        <div className="p-5">{children}</div>
        {footer && (
          <div className="border-t border-black/10 p-5 dark:border-white/10">
            {footer}
          </div>
        )}
      </section>
    );
  }

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
          as={formId ? "form" : "div"}
          id={formId}
          onSubmit={onSubmit}
          style={maxHeight ? { maxHeight } : undefined}
          className={`mx-auto flex w-full min-h-0 flex-col ${sizeStyles[size]} ${maxHeight ? "" : "max-h-[min(42rem,calc(100dvh-max(1rem,env(safe-area-inset-top))-max(1rem,env(safe-area-inset-bottom))))] sm:max-h-[calc(100dvh-max(1rem,env(safe-area-inset-top))-max(1rem,env(safe-area-inset-bottom)))]"} overflow-hidden rounded-2xl border border-black/15 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/5 dark:border-white/20 dark:bg-[#181818] dark:shadow-[0_28px_100px_rgba(0,0,0,0.85)] dark:ring-white/10 ${panelClassName ?? ""}`}
        >
          <div className="flex w-full shrink-0 items-start justify-between gap-4 border-b border-black/10 px-6 pb-4 pt-6 dark:border-white/10">
            <div className="min-w-0">
              <DialogTitle className="text-xl font-cooper text-black md:text-2xl dark:text-white">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="mt-3 text-sm leading-relaxed text-black/65 dark:text-white/65">
                  {description}
                </DialogDescription>
              )}
            </div>
            {closable && (
              <IconButton label="Close dialog" onClick={() => setIsOpen(false)}>
                <Close className="h-5 w-5" />
              </IconButton>
            )}
          </div>
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            <div
              ref={scrollContainerRef}
              onScroll={updateScrollState}
              className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
            >
              <div ref={scrollContentRef} className="p-6">
                {children}
              </div>
            </div>
            {scrollState.canScrollUp && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-black/15 to-transparent dark:from-black/45"
              />
            )}
            {scrollState.canScrollDown && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-16 items-end justify-center bg-gradient-to-t from-white via-white/90 to-transparent pb-2 dark:from-[#181818] dark:via-[#181818]/90"
              >
                <span className="flex items-center gap-1 rounded-full border border-black/10 bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-black/65 shadow-sm dark:border-white/15 dark:bg-[#242424]/95 dark:text-white/70">
                  Scroll for more
                  <MdKeyboardArrowDown className="h-4 w-4" />
                </span>
              </div>
            )}
          </div>
          {(footer || (!hideActions && (actions || legacyActions))) && (
            <div className="shrink-0 border-t border-black/10 px-6 py-4 dark:border-white/10">
              {footer ??
                (actions ? (
                  <div className="flex justify-end">{actions}</div>
                ) : (
                  legacyActions
                ))}
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export { Modal };
