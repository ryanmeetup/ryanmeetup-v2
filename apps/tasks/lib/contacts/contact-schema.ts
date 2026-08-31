import { isContactGroup, type ContactDraftPerson } from "./contact-types";
import { formatInstagramHandle, normalizeHttpUrl } from "@ryanmeetup/utils";
import {
  isUuid,
  nullableTrimmedText,
  objectWithKeys,
  requiredTrimmedText,
  uuidList,
} from "@/lib/api-schema/shared";

export function contactSaveSchema(value: unknown) {
  const allowed = [
    "id",
    "displayName",
    "imageUrl",
    "retainImage",
    "contactGroup",
    "notes",
    "categoryIds",
    "newCategoryNames",
    "people",
  ];
  const body = objectWithKeys(value, allowed);
  if (!body) return null;
  if (body.id !== undefined && !isUuid(body.id)) return null;
  const displayName = requiredTrimmedText(body.displayName, 160);
  const notes = nullableTrimmedText(body.notes, 5000);
  const rawImageUrl = nullableTrimmedText(body.imageUrl, 2048);
  const retainImage = body.retainImage === true;
  const contactGroup = nullableTrimmedText(body.contactGroup, 80);
  if (
    !displayName ||
    notes === undefined ||
    rawImageUrl === undefined ||
    contactGroup === undefined ||
    (contactGroup && !isContactGroup(contactGroup))
  )
    return null;
  const imageUrl = rawImageUrl ? normalizeHttpUrl(rawImageUrl) : null;
  if (rawImageUrl && !imageUrl) return null;
  const categoryIds = uuidList(body.categoryIds);
  if (!categoryIds) return null;
  if (
    !Array.isArray(body.newCategoryNames) ||
    body.newCategoryNames.length > 100
  )
    return null;
  const newCategoryNames = [
    ...new Set(
      body.newCategoryNames.map((name) => requiredTrimmedText(name, 80)),
    ),
  ];
  if (newCategoryNames.some((name) => !name)) return null;
  if (!Array.isArray(body.people) || body.people.length > 100) return null;
  const people: ContactDraftPerson[] = [];
  for (const value of body.people) {
    const person = objectWithKeys(value, [
      "id",
      "full_name",
      "title",
      "emails",
      "phone",
      "instagram_handle",
    ]);
    if (!person || (person.id !== undefined && !isUuid(person.id))) return null;
    const fullName = requiredTrimmedText(person.full_name, 160);
    const title = nullableTrimmedText(person.title ?? "", 160);
    const phone = nullableTrimmedText(person.phone ?? "", 40);
    const instagramText =
      typeof person.instagram_handle === "string"
        ? person.instagram_handle
        : "";
    const instagram = nullableTrimmedText(
      formatInstagramHandle(instagramText),
      100,
    );
    if (
      !fullName ||
      title === undefined ||
      phone === undefined ||
      instagram === undefined
    )
      return null;
    if (!Array.isArray(person.emails) || person.emails.length > 1) return null;
    const emails = [
      ...new Set(person.emails.map((email) => requiredTrimmedText(email, 254))),
    ];
    if (
      emails.some(
        (email) => !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      )
    )
      return null;
    people.push({
      id: person.id as string | undefined,
      full_name: fullName,
      title: title || null,
      emails: emails as string[],
      phone: phone || null,
      instagram_handle: instagram || null,
    });
  }
  return {
    id: body.id as string | undefined,
    displayName,
    imageUrl: imageUrl || null,
    retainImage,
    contactGroup: contactGroup || null,
    notes: notes || null,
    categoryIds,
    newCategoryNames: newCategoryNames as string[],
    people,
  };
}

export function contactDeleteSchema(value: unknown) {
  const body = objectWithKeys(value, ["id"]);
  return body && Object.keys(body).length === 1 && isUuid(body.id)
    ? { id: body.id }
    : null;
}
