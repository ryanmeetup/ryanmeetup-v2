"use client";

import { MdArrowBack } from "react-icons/md";
import type { FormEventHandler, ReactNode } from "react";
import { EditorFooter, EditorHeader } from "./editorChrome";
import { IconButton } from "./IconButton";

export type EditorPageProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Where the dismissing control goes back to. */
  backHref: string;
  backLabel?: string;
  /**
   * The primary button group, right-aligned in the action bar. Pass
   * `ModalActions` for the standard cancel/confirm pair, exactly as `Modal`
   * takes it.
   */
  actions?: ReactNode;
  /** Left-aligned actions — destructive or secondary escapes. */
  supportingActions?: ReactNode;
  /** Content that sits above the button rows. */
  footerContent?: ReactNode;
  formId?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  className?: string;
};

/**
 * The page counterpart to `Modal`: the same editor chrome and the same
 * `formId`/`onSubmit` contract, laid out as a full-height surface instead of a
 * dialog card. Editors that render into both take a `presentation` prop and
 * change nothing else.
 *
 * The difference that matters on a phone is scrolling. `Modal` bounds itself to
 * `min(42rem, viewport)` and scrolls the form inside that box, which leaves very
 * little room once the header, the footer, and the virtual keyboard have taken
 * their share. This surface lets the document scroll — so the browser's own
 * URL-bar collapse gives the form the full viewport — and pins only the action
 * bar, so save and cancel stay reachable without scrolling to the end of a long
 * form.
 */
export function EditorPage({
  title,
  description,
  children,
  backHref,
  backLabel = "Back",
  actions,
  supportingActions,
  footerContent,
  formId,
  onSubmit,
  className,
}: EditorPageProps) {
  const surface = (
    <>
      <EditorHeader
        title={title}
        description={description}
        titleAs="h1"
        action={
          <IconButton.Link href={backHref} label={backLabel}>
            <MdArrowBack className="h-5 w-5" />
          </IconButton.Link>
        }
        className="px-4 pb-4 pt-5 sm:px-6 sm:pt-6"
      />
      <div className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</div>
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-xl dark:bg-[#181818]/95">
        <EditorFooter
          actions={actions}
          supportingActions={supportingActions}
          footerContent={footerContent}
          className="px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
        />
      </div>
    </>
  );

  const surfaceClassName = `flex min-h-0 min-w-0 flex-1 flex-col border-black/15 bg-white text-black dark:border-white/20 dark:bg-[#181818] dark:text-white sm:rounded-2xl sm:border sm:shadow-[0_24px_80px_rgba(0,0,0,0.15)] dark:sm:shadow-[0_28px_100px_rgba(0,0,0,0.6)] ${className ?? ""}`;

  return formId ? (
    <form id={formId} onSubmit={onSubmit} className={surfaceClassName}>
      {surface}
    </form>
  ) : (
    <div className={surfaceClassName}>{surface}</div>
  );
}
