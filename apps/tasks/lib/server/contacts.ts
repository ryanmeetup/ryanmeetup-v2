import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTACT_COLUMNS, type Contact } from "@/lib/contact-types";

type ContactRow = Omit<Contact, "categories" | "people"> & {
  contact_people: Contact["people"];
  contact_category_assignments: Array<{
    contact_categories: Contact["categories"][number] | null;
  }>;
};

export function shapeContact(row: ContactRow): Contact {
  return {
    id: row.id,
    display_name: row.display_name,
    image_url: row.image_url,
    contact_group: row.contact_group,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    people: [...(row.contact_people ?? [])].sort((a, b) =>
      a.full_name.localeCompare(b.full_name),
    ),
    categories: (row.contact_category_assignments ?? [])
      .map((item) => item.contact_categories)
      .filter((item): item is Contact["categories"][number] => Boolean(item))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function loadContacts(supabase: SupabaseClient) {
  const result = await supabase
    .from("contacts")
    .select(CONTACT_COLUMNS)
    .order("display_name");
  return {
    ...result,
    data: result.data?.map((row) => shapeContact(row as unknown as ContactRow)),
  };
}

export async function loadContactCategories(supabase: SupabaseClient) {
  return supabase
    .from("contact_categories")
    .select("id,name,color")
    .order("name");
}

export async function loadContact(supabase: SupabaseClient, id: string) {
  const result = await supabase
    .from("contacts")
    .select(CONTACT_COLUMNS)
    .eq("id", id)
    .single();
  return {
    ...result,
    data: result.data
      ? shapeContact(result.data as unknown as ContactRow)
      : null,
  };
}
