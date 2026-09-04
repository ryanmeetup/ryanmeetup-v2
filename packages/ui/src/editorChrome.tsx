"use client";

import type { ElementType, ReactNode } from "react";

/**
 * `Modal`'s own header and footer, kept apart from the dialog shell so the
 * pieces that are not dialog-specific can be reused.
 *
 * `footerActionGroup` is the one piece the editor *routes* borrow: a page lays
 * its commit pair out with the same stacked-then-inline geometry a dialog
 * footer uses, so the buttons read the same wherever an editor is opened. The
 * rest is dialog chrome and stays here — a route builds its heading from
 * `PageHeader` and a breadcrumb trail instead, because it is a screen rather
 * than a layer over one.
 */

/**
 * Footer action groups own their children's widths: stacked and full-width on
 * mobile, inline and hugging their content from `sm` up.
 */
export const footerActionGroup =
  "flex gap-3 [&>*]:w-full [&>span>*]:w-full sm:flex-row sm:items-center sm:gap-2 sm:[&>*]:w-auto sm:[&>span>*]:w-auto";

export type EditorHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /**
   * The elements the title and description render as. `Modal` passes Headless
   * UI's `DialogTitle`/`DialogDescription` so the dialog stays labelled; a page
   * passes real heading and paragraph tags.
   */
  titleAs?: ElementType;
  descriptionAs?: ElementType;
  /** The dismissing control — a close button in a dialog, a back link on a page. */
  action?: ReactNode;
  className?: string;
};

export function EditorHeader({
  title,
  description,
  titleAs: Title = "h2",
  descriptionAs: Description = "p",
  action,
  className = "px-6 pb-4 pt-6",
}: EditorHeaderProps) {
  return (
    <div
      className={`flex w-full shrink-0 items-start justify-between gap-4 border-b border-black/10 dark:border-white/10 ${className}`}
    >
      <div className="min-w-0">
        <Title className="text-xl font-cooper text-black md:text-2xl dark:text-white">
          {title}
        </Title>
        {description && (
          <Description className="mt-3 text-sm leading-relaxed text-black/65 dark:text-white/65">
            {description}
          </Description>
        )}
      </div>
      {action}
    </div>
  );
}

export type EditorFooterProps = {
  /** The primary button group, right-aligned. */
  actions?: ReactNode;
  /** Left-aligned destructive or secondary escapes. */
  supportingActions?: ReactNode;
  /** Content that sits above the button rows. */
  footerContent?: ReactNode;
  className?: string;
};

export function EditorFooter({
  actions,
  supportingActions,
  footerContent,
  className = "px-6 py-4",
}: EditorFooterProps) {
  if (!footerContent && !supportingActions && !actions) return null;
  return (
    <div
      className={`shrink-0 border-t border-black/10 dark:border-white/10 ${className}`}
    >
      {footerContent}
      {(supportingActions || actions) && (
        <div
          className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${footerContent ? "mt-4 border-t border-black/10 pt-4 dark:border-white/10" : ""}`}
        >
          {supportingActions && (
            <div className="flex flex-wrap items-center gap-2">
              {supportingActions}
            </div>
          )}
          {actions && (
            <div
              className={`${footerActionGroup} flex-col-reverse sm:ml-auto sm:justify-end`}
            >
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
