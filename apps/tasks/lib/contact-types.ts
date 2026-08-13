export type ContactCategory = {
  id: string;
  name: string;
  color: string;
};

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
  notes: string;
  categoryIds: string[];
  newCategoryNames: string[];
  people: ContactDraftPerson[];
};

export const CONTACT_COLUMNS =
  "id,display_name,image_url,notes,created_at,updated_at,contact_people(id,full_name,title,emails,phone,instagram_handle),contact_category_assignments(contact_categories(id,name,color))";
