"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "@ryanmeetup/ui";
import { formatInstagramHandle } from "@ryanmeetup/utils";
import { mutate } from "@/lib/mutation-client";
import { errorMessage } from "@/lib/presentation";
import type { Contact, ContactDraft } from "@/lib/contacts/contact-types";

/**
 * Creating and updating a contact, shared by the contacts page's dialog and the
 * dedicated mobile editor routes. Both surfaces write the same rows, so the
 * demo-mode simulation and the API call live here rather than in either client.
 */
export function useContactSave({
  demoMode,
  editing,
  setContacts,
  onSaved,
}: {
  demoMode: boolean;
  /** The contact being edited, for the fields a draft does not carry. */
  editing?: Contact | null;
  setContacts: Dispatch<SetStateAction<Contact[]>>;
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
      setContacts((current) => {
        const exists = current.some(
          (contact) => contact.id === result.contact.id,
        );
        return exists
          ? current.map((contact) =>
              contact.id === result.contact.id ? result.contact : contact,
            )
          : [...current, result.contact];
      });
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
