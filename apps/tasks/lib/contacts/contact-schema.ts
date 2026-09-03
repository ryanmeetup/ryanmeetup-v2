import {
  isContactGroup,
  type ContactDraftPerson,
  type ContactMethod,
} from "./contact-types";
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
      "phones",
      "instagram_handle",
    ]);
    if (!person || (person.id !== undefined && !isUuid(person.id))) return null;
    const fullName = requiredTrimmedText(person.full_name, 160);
    const title = nullableTrimmedText(person.title ?? "", 160);
    const instagramText =
      typeof person.instagram_handle === "string"
        ? person.instagram_handle
        : "";
    const instagram = nullableTrimmedText(
      formatInstagramHandle(instagramText),
      100,
    );
    if (!fullName || title === undefined || instagram === undefined)
      return null;
    const emails = contactMethods(person.emails, "email");
    const phones = contactMethods(person.phones, "phone");
    if (!emails || !phones) return null;
    people.push({
      id: person.id as string | undefined,
      full_name: fullName,
      title: title || null,
      emails,
      phones,
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

function contactMethods(value: unknown, kind: "email" | "phone") {
  if (!Array.isArray(value) || value.length > 10) return null;
  const methods: ContactMethod[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const method = objectWithKeys(item, ["label", "value"]);
    if (!method) return null;
    const label = nullableTrimmedText(method.label ?? "", 40);
    const methodValue = requiredTrimmedText(
      method.value,
      kind === "email" ? 254 : 40,
    );
    if (
      label === undefined ||
      !methodValue ||
      (kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(methodValue))
    )
      return null;
    const normalized =
      kind === "email" ? methodValue.toLowerCase() : methodValue;
    if (seen.has(normalized)) return null;
    seen.add(normalized);
    methods.push({ label: label || null, value: normalized });
  }
  return methods;
}

export function contactDeleteSchema(value: unknown) {
  const body = objectWithKeys(value, ["id"]);
  return body && Object.keys(body).length === 1 && isUuid(body.id)
    ? { id: body.id }
    : null;
}
