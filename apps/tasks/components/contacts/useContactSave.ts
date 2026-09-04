"use client";

import { useState } from "react";
import { toast } from "@ryanmeetup/ui";
import { formatInstagramHandle } from "@ryanmeetup/utils";
import { mutate } from "@/lib/mutation-client";
import { errorMessage } from "@/lib/presentation";
import type { Contact, ContactDraft } from "@/lib/contacts/contact-types";

/**
 * Creating and updating a contact from the dedicated editor routes. The
 * demo-mode simulation and API call live here so the route client only owns
 * page state and navigation.
 */
export function useContactSave({
  demoMode,
  editing,
  onSaved,
}: {
  demoMode: boolean;
  /** The contact being edited, for the fields a draft does not carry. */
  editing?: Contact | null;
  onSaved: (contact: Contact) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function saveContact(draft: ContactDraft, imageFile: File | null) {
    setSaving(true);
    try {
      let result: { contact: Contact };
      if (demoMode) {
        const now = new Date().toISOString();
        result = {
          contact: {
            id: draft.id ?? crypto.randomUUID(),
            display_name: draft.displayName.trim(),
            image_url: imageFile
              ? URL.createObjectURL(imageFile)
              : draft.imageUrl ||
                (draft.retainImage ? (editing?.image_url ?? null) : null),
            image_path: imageFile ? "demo" : null,
            contact_group: draft.contactGroup || null,
            notes: draft.notes.trim() || null,
            created_at: editing?.created_at ?? now,
            updated_at: now,
            categories: editing?.categories ?? [],
            people: draft.people.map((person) => ({
              ...person,
              id: person.id ?? crypto.randomUUID(),
              full_name: person.full_name.trim(),
              title: person.title?.trim() || null,
              emails: person.emails.map((method) => ({
                label: method.label?.trim() || null,
                value: method.value.trim().toLowerCase(),
              })),
              phones: person.phones.map((method) => ({
                label: method.label?.trim() || null,
                value: method.value.trim(),
              })),
              instagram_handle:
                formatInstagramHandle(person.instagram_handle ?? "") || null,
            })),
          },
        };
      } else {
        const body = imageFile
          ? (() => {
              const formData = new FormData();
              formData.set("contact", JSON.stringify(draft));
              formData.set("file", imageFile);
              return formData;
            })()
          : JSON.stringify(draft);
        result = await mutate("/api/contacts", {
          method: draft.id ? "PATCH" : "POST",
          body,
        });
      }
      onSaved(result.contact);
      toast.success(draft.id ? "Contact updated." : "Contact added.");
    } catch (error) {
      toast.error(errorMessage(error, "The contact could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  return { saving, saveContact };
}
