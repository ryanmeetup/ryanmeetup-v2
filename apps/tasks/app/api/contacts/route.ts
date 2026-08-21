import { NextResponse } from "next/server";
import { contactDeleteSchema, contactSaveSchema } from "@/lib/contacts/contact-schema";
import { databaseFailure } from "@/lib/server/api-response";
import { authorize } from "@/lib/server/auth";
import { loadContact } from "@/lib/server/contacts";
import { readJson } from "@/lib/server/request";
import { recordWorkspaceActivity } from "@/lib/server/privileged-api";

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
      error: "The contact could not be saved. Try again.",
      conflictError: "A contact or category with that name already exists.",
    });
  const imageUpdate = await authorization.supabase
    .from("contacts")
    .update({
      image_url: parsed.data.imageUrl,
      contact_group: parsed.data.contactGroup,
    })
    .eq("id", contactId);
  if (imageUpdate.error)
    return databaseFailure(request, "contact.image", imageUpdate.error, {
      error: "The contact was saved, but its details could not be updated.",
    });
  const result = await loadContact(authorization.supabase, contactId);
  if (result.error)
    return databaseFailure(request, "contact.read-after-save", result.error, {
      error: "The contact was saved, but could not be reloaded.",
    });
  if (!result.data)
    return NextResponse.json(
      { error: "The contact was saved, but could not be reloaded." },
      { status: 500 },
    );
  if (
    !(await recordWorkspaceActivity(authorization.user, {
      action: parsed.data.id ? "organization.update" : "organization.create",
      targetType: "organization",
      targetId: contactId,
      name: result.data.display_name,
      href: "/contacts",
    }))
  )
    return NextResponse.json(
      {
        error: "The contact was saved, but its activity could not be recorded.",
      },
      { status: 500 },
    );
  if (parsed.data.newCategoryNames.length) {
    const categories = await authorization.supabase
      .from("work_groups")
      .select("id,name")
      .in("name", parsed.data.newCategoryNames);
    if (categories.error)
      return databaseFailure(
        request,
        "contact.category-activity",
        categories.error,
        {
          error:
            "The contact was saved, but its new categories could not be recorded.",
        },
      );
    const categoryActivity = await Promise.all(
      (categories.data ?? []).map((category) =>
        recordWorkspaceActivity(authorization.user, {
          action: "category.create",
          targetType: "category",
          targetId: category.id,
          name: category.name,
          href: "/categories",
        }),
      ),
    );
    if (categoryActivity.some((recorded) => !recorded))
      return NextResponse.json(
        {
          error:
            "The contact was saved, but its new category activity could not be recorded.",
        },
        { status: 500 },
      );
  }
  return NextResponse.json({ contact: result.data });
}

export const POST = save;
export const PATCH = save;

export async function DELETE(request: Request) {
  const parsed = await readJson(request, contactDeleteSchema);
  if ("response" in parsed) return parsed.response;
  const authorization = await authorize({ onboarded: true });
  if ("response" in authorization) return authorization.response;
  const result = await authorization.supabase
    .from("contacts")
    .delete()
    .eq("id", parsed.data.id)
    .select("id,display_name")
    .single();
  if (result.error)
    return databaseFailure(request, "contact.delete", result.error, {
      error: "The contact could not be deleted. Try again.",
    });
  if (
    !(await recordWorkspaceActivity(authorization.user, {
      action: "organization.delete",
      targetType: "organization",
      targetId: result.data.id,
      name: result.data.display_name,
    }))
  )
    return NextResponse.json(
      {
        error:
          "The contact was deleted, but its activity could not be recorded.",
      },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}
