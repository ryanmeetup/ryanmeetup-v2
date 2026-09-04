import type { Contact } from "./contact-types";

/** Enough of a contact to name it in a URL. */
export type ContactRef = Pick<Contact, "id" | "display_name">;

/**
 * The readable form of a contact's display name: "The Lantern Room" becomes
 * "the-lantern-room". Returns an empty string for a name with nothing to
 * slugify, such as one written entirely in a non-Latin script.
 */
export function contactSlug(displayName: string) {
  return displayName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
}

/**
 * What `/contacts/[contact]/edit` should carry for this contact.
 *
 * Display names are not unique, so the slug is only used when it names exactly
 * one contact in `contacts`; two venues called "Harbor Hall" keep their ids
 * rather than resolving to whichever row matched first. A name with no letters
 * or digits keeps its id for the same reason.
 */
export function contactRouteId(contact: ContactRef, contacts: ContactRef[]) {
  const slug = contactSlug(contact.display_name);
  if (!slug) return contact.id;
  const sharing = contacts.filter(
    (other) => contactSlug(other.display_name) === slug,
  );
  return sharing.length > 1 ? contact.id : slug;
}

/**
 * The inverse: which contact a `/contacts/[contact]` segment names.
 *
 * An id still resolves, so links shared before slugs existed keep working, and
 * so does the fallback `contactRouteId` writes for a duplicated name. An
 * ambiguous slug resolves to nothing rather than to a guess.
 */
export function findContactByRouteId<Item extends ContactRef>(
  contacts: Item[],
  routeId: string,
) {
  const slug = routeId.trim().toLowerCase();
  const named = contacts.filter(
    (contact) => contactSlug(contact.display_name) === slug,
  );
  if (named.length === 1) return named[0];
  return contacts.find((contact) => contact.id === routeId);
}

/** The contact directory: where the editor routes return to. */
export const CONTACTS_HREF = "/contacts";

/** The dedicated edit route. See `docs/MOBILE_EDITOR_SURFACES.md`. */
export function contactEditPath(contact: ContactRef, contacts: ContactRef[]) {
  return `/contacts/${contactRouteId(contact, contacts)}/edit`;
}
