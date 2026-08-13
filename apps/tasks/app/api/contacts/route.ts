import { NextResponse } from "next/server";
import { contactDeleteSchema, contactSaveSchema } from "@/lib/contact-schema";
import { databaseFailure } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import { loadContact } from "@/lib/server/contacts";
import { readJson } from "@/lib/server/request";

async function save(request: Request) {
  const parsed = await readJson(request, contactSaveSchema);
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const { data: contactId, error } = await authorization.supabase.rpc(
    "save_contact",
    {
      contact_id: parsed.data.id ?? null,
      contact_name: parsed.data.displayName,
      contact_notes: parsed.data.notes,
      category_ids: parsed.data.categoryIds,
      new_category_names: parsed.data.newCategoryNames,
      people: parsed.data.people,
    },
  );
  if (error)
    return databaseFailure(request, "contact.save", error, {
      error: "The organization could not be saved. Try again.",
      conflictError: "An organization or category with that name already exists.",
    });
  const imageUpdate = await authorization.supabase
    .from("contacts")
    .update({ image_url: parsed.data.imageUrl })
    .eq("id", contactId);
  if (imageUpdate.error)
    return databaseFailure(request, "contact.image", imageUpdate.error, {
      error: "The organization was saved, but its image could not be updated.",
    });
  const result = await loadContact(authorization.supabase, contactId);
  if (result.error)
    return databaseFailure(request, "contact.read-after-save", result.error, {
      error: "The contact was saved, but could not be reloaded.",
    });
  if (!result.data)
    return NextResponse.json(
      { error: "The organization was saved, but could not be reloaded." },
      { status: 500 },
    );
  return NextResponse.json({ contact: result.data });
}

export const POST = save;
export const PATCH = save;

export async function DELETE(request: Request) {
  const parsed = await readJson(request, contactDeleteSchema);
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const { error } = await authorization.supabase
    .from("contacts")
    .delete()
    .eq("id", parsed.data.id);
  if (error)
    return databaseFailure(request, "contact.delete", error, {
      error: "The organization could not be deleted. Try again.",
    });
  return NextResponse.json({ ok: true });
}
