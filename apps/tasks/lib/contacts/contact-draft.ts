import { formatInstagramHandle } from "@ryanmeetup/utils";
import type { ContactDraft } from "./contact-types";

/**
 * A canonical form of an editor draft, for answering "has anything changed?".
 *
 * It normalizes exactly what a save normalizes — trimming, lowercasing an
 * email address, reading an emptied title as no title — so that typing a space
 * into a field and taking it back out is not counted as an edit.
 *
 * Everything it cannot be sure about, it treats as a change. Person ids are
 * part of the signature, so a person deleted and retyped identically still
 * reads as edited. Being wrong in that direction only leaves the save button
 * enabled on a save that would write the same values; being wrong the other
 * way would refuse a real edit.
 */
export function contactDraftSignature(draft: ContactDraft) {
  return JSON.stringify({
    displayName: draft.displayName.trim(),
    imageUrl: draft.imageUrl.trim(),
    retainImage: draft.retainImage,
    contactGroup: draft.contactGroup,
    notes: draft.notes.trim(),
    categoryIds: [...draft.categoryIds].sort(),
    newCategoryNames: [
      ...new Set(draft.newCategoryNames.map((name) => name.trim())),
    ].sort(),
    people: draft.people.map((person) => ({
      id: person.id ?? null,
      full_name: person.full_name.trim(),
      title: person.title?.trim() || null,
      emails: person.emails.map((method) => [
        method.label?.trim() || null,
        method.value.trim().toLowerCase(),
      ]),
      phones: person.phones.map((method) => [
        method.label?.trim() || null,
        method.value.trim(),
      ]),
      instagram_handle:
        formatInstagramHandle(person.instagram_handle ?? "") || null,
    })),
  });
}
