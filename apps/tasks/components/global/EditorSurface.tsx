"use client";

import { EditorPage, Modal, type ModalSize } from "@ryanmeetup/ui";
import type { FormEventHandler, ReactNode } from "react";

type EditorSurfaceCommonProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** The primary button group. Pass `ModalActions` on either surface. */
  actions?: ReactNode;
  /** Left-aligned destructive or secondary escapes. */
  supportingActions?: ReactNode;
  footerContent?: ReactNode;
  formId?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
};

/**
 * Dialog-shaped props. A page has no card to size and no dimmed backdrop to
 * dismiss, so it ignores every one of them. They stay assignable on both
 * branches because the editors that render into either surface compute them
 * unconditionally — making them a hard error on the page branch would only buy
 * a pile of ternaries at each call site.
 */
type EditorDialogProps = {
  /**
   * Defaults to open: a surface that is rendered at all is usually shown.
   *
   * A page honours this as well as a dialog does. The editors that own both a
   * create and an edit surface keep them both mounted and close one with this
   * flag — `open={modal.open && !editingId}` — so a page that ignored it would
   * render the create form underneath the edit form.
   */
  open?: boolean;
  size?: ModalSize;
  maxHeight?: string;
  maxWidth?: string;
  panelClassName?: string;
  closable?: boolean;
};

export type EditorSurfaceProps = EditorSurfaceCommonProps &
  EditorDialogProps &
  (
    | { presentation?: "modal"; setOpen: (open: boolean) => void }
    | {
        presentation: "page";
        /** Where the back control returns to. */
        backHref: string;
        backLabel?: string;
        setOpen?: (open: boolean) => void;
      }
  );

/**
 * One editor, two surfaces: the shared `Modal` on desktop and `EditorPage` on
 * the dedicated mobile route. Every Tier 1 editor renders through this so the
 * choice is made in exactly one place per editor, and so the form body never
 * has to know which surface it landed in.
 *
 * The dialog-shaped props — `size`, `panelClassName`, `closable` — are only
 * accepted alongside `presentation: "modal"`, since a page has no card to size
 * and always offers its back control. See `docs/MOBILE_EDITOR_SURFACES.md`.
 */
export function EditorSurface(props: EditorSurfaceProps) {
  const {
    title,
    description,
    children,
    actions,
    supportingActions,
    footerContent,
    formId,
    onSubmit,
  } = props;

  if (props.presentation === "page") {
    if (props.open === false) return null;
    return (
      <EditorPage
        title={title}
        description={description}
        backHref={props.backHref}
        backLabel={props.backLabel}
        actions={actions}
        supportingActions={supportingActions}
        footerContent={footerContent}
        formId={formId}
        onSubmit={onSubmit}
      >
        {children}
      </EditorPage>
    );
  }

  return (
    <Modal
      open={props.open ?? true}
      setIsOpen={props.setOpen ?? (() => undefined)}
      title={title}
      description={description}
      size={props.size}
      maxHeight={props.maxHeight}
      maxWidth={props.maxWidth}
      panelClassName={props.panelClassName}
      closable={props.closable}
      actions={actions}
      supportingActions={supportingActions}
      footerContent={footerContent}
      formId={formId}
      onSubmit={onSubmit}
    >
      {children}
    </Modal>
  );
}
