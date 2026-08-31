/**
 * Turns pasted text into checklist items.
 *
 * Checklists are usually copied out of a markdown document, an issue, or a
 * plain list, where the leading bullet, number, or task box is structure the
 * reader already sees rather than part of the item's own text. Pasting that
 * into a single-line input otherwise collapses the whole list into one item
 * with the markup still in it.
 */

/** Bullets and ordered-list numbering. Indentation is trimmed beforehand. */
const LIST_MARKER = /^(?:[-*+•]|\d+[.)])\s+/;
/**
 * A bullet with nothing after it. `LIST_MARKER` requires trailing space so
 * that "-42 degrees" keeps its hyphen, which leaves this case to catch.
 */
const BARE_MARKER = /^(?:[-*+•]|\d+[.)])$/;
/** A markdown task box, with or without a bullet in front of it. */
const TASK_BOX = /^\[([ xX✓])\]\s*/;
/** A markdown horizontal rule, which carries no text of its own. */
const HORIZONTAL_RULE = /^(?:-{3,}|\*{3,}|_{3,})$/;

/** More than one person would paste in a single gesture. */
export const MAX_CHECKLIST_PASTE_ITEMS = 100;

export type ChecklistPasteItem = { title: string; completed: boolean };

export function parseChecklistPaste(text: string): ChecklistPasteItem[] {
  return text.split(/\r\n|\r|\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (
      !trimmed ||
      BARE_MARKER.test(trimmed) ||
      HORIZONTAL_RULE.test(trimmed)
    )
      return [];
    const withoutMarker = trimmed.replace(LIST_MARKER, "");
    const box = TASK_BOX.exec(withoutMarker);
    const title = (
      box ? withoutMarker.slice(box[0].length) : withoutMarker
    ).trim();
    // A line that was only a bullet or an empty box contributes nothing.
    return title ? [{ title, completed: box !== null && box[1] !== " " }] : [];
  });
}

/**
 * Whether a paste should become checklist items instead of input text.
 *
 * A single item stays an ordinary paste so the box still fills with text the
 * author can edit before committing it; only a real list is worth taking over
 * the input for.
 */
export function isChecklistPaste(items: ChecklistPasteItem[]) {
  return items.length > 1;
}
