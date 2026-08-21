import { isContactGroup, type ContactDraftPerson } from "./contact-types";
import { formatInstagramHandle, normalizeHttpUrl } from "@ryanmeetup/utils";

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const cleanText = (value: unknown, max: number, required = false) => {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return (!required || text) && text.length <= max ? text : null;
};

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export function contactSaveSchema(value: unknown) {
  if (!isObject(value)) return null;
  const allowed = [
    "id",
    "displayName",
    "imageUrl",
    "contactGroup",
    "notes",
    "categoryIds",
    "newCategoryNames",
    "people",
  ];
  if (Object.keys(value).some((key) => !allowed.includes(key))) return null;
  if (value.id !== undefined && !isUuid(value.id)) return null;
  const displayName = cleanText(value.displayName, 160, true);
  const notes = cleanText(value.notes, 5000);
  const rawImageUrl = cleanText(value.imageUrl, 2048);
  const contactGroup = cleanText(value.contactGroup, 80);
  if (
    !displayName ||
    notes === null ||
    rawImageUrl === null ||
    contactGroup === null ||
    (contactGroup && !isContactGroup(contactGroup))
  )
    return null;
  const imageUrl = rawImageUrl ? normalizeHttpUrl(rawImageUrl) : null;
  if (rawImageUrl && !imageUrl) return null;
  if (!Array.isArray(value.categoryIds) || value.categoryIds.length > 100)
    return null;
  const categoryIds = [...new Set(value.categoryIds)];
  if (!categoryIds.every(isUuid)) return null;
  if (
    !Array.isArray(value.newCategoryNames) ||
    value.newCategoryNames.length > 100
  )
    return null;
  const newCategoryNames = [
    ...new Set(value.newCategoryNames.map((name) => cleanText(name, 80, true))),
  ];
  if (newCategoryNames.some((name) => !name)) return null;
  if (!Array.isArray(value.people) || value.people.length > 100) return null;
  const people: ContactDraftPerson[] = [];
  for (const person of value.people) {
    if (!isObject(person)) return null;
    if (
      Object.keys(person).some(
        (key) =>
          ![
            "id",
            "full_name",
            "title",
            "emails",
            "phone",
            "instagram_handle",
          ].includes(key),
      ) ||
      (person.id !== undefined && !isUuid(person.id))
    )
      return null;
    const fullName = cleanText(person.full_name, 160, true);
    const title = cleanText(person.title ?? "", 160);
    const phone = cleanText(person.phone ?? "", 40);
    const instagramText =
      typeof person.instagram_handle === "string"
        ? person.instagram_handle
        : "";
    const instagram = cleanText(formatInstagramHandle(instagramText), 100);
    if (!fullName || title === null || phone === null || instagram === null)
      return null;
    if (!Array.isArray(person.emails) || person.emails.length > 1) return null;
    const emails = [
      ...new Set(person.emails.map((email) => cleanText(email, 254, true))),
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
    id: value.id as string | undefined,
    displayName,
    imageUrl: imageUrl || null,
    contactGroup: contactGroup || null,
    notes: notes || null,
    categoryIds: categoryIds as string[],
    newCategoryNames: newCategoryNames as string[],
    people,
  };
}

export function contactDeleteSchema(value: unknown) {
  return isObject(value) && Object.keys(value).length === 1 && isUuid(value.id)
    ? { id: value.id }
    : null;
}
