export type ContactCategory = {
  id: string;
  name: string;
  color: string;
};

export const CONTACT_GROUPS = [
  "Brand Partner",
  "Venue & Host",
  "Event Vendor",
  "Hospitality",
  "Media & Press",
  "Talent & Entertainment",
] as const;

export type ContactGroup = (typeof CONTACT_GROUPS)[number];

export const isContactGroup = (value: unknown): value is ContactGroup =>
  typeof value === "string" && CONTACT_GROUPS.includes(value as ContactGroup);

export type ContactPerson = {
  id: string;
  full_name: string;
  title: string | null;
  emails: string[];
  phone: string | null;
  instagram_handle: string | null;
};

export type Contact = {
  id: string;
  display_name: string;
  image_url: string | null;
  contact_group: ContactGroup | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  categories: ContactCategory[];
  people: ContactPerson[];
};

export type ContactDraftPerson = Omit<ContactPerson, "id"> & { id?: string };

export type ContactDraft = {
  id?: string;
  displayName: string;
  imageUrl: string;
  contactGroup: ContactGroup | "";
  notes: string;
  categoryIds: string[];
  newCategoryNames: string[];
  people: ContactDraftPerson[];
};

export const CONTACT_COLUMNS =
  "id,display_name,image_url,contact_group,notes,created_at,updated_at,contact_people(id,full_name,title,emails,phone,instagram_handle),contact_category_assignments(contact_categories(id,name,color))";
