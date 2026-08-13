"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  Button,
  DisclosureCard,
  IconButton,
  Input,
  Modal,
  Textarea,
} from "@ryanmeetup/ui";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import type {
  Contact,
  ContactDraft,
  ContactDraftPerson,
} from "@/lib/contact-types";

const blankPerson = (): ContactDraftPerson => ({
  full_name: "",
  emails: [],
  phone: null,
  instagram_handle: null,
});

const editorFormId = "contact-editor-form";

const makeDraft = (contact?: Contact | null): ContactDraft => ({
  id: contact?.id,
  displayName: contact?.display_name ?? "",
  imageUrl: contact?.image_url ?? "",
  notes: contact?.notes ?? "",
  categoryIds: contact?.categories.map((category) => category.id) ?? [],
  newCategoryNames: [],
  people:
    contact?.people.map((person) => ({
      ...person,
      emails: person.emails.slice(0, 1),
    })) ?? [],
});

export function ContactEditor({
  contact,
  open,
  saving,
  onClose,
  onSave,
}: {
  contact?: Contact | null;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: ContactDraft, imageFile: File | null) => void;
}) {
  const [draft, setDraft] = useState(() => makeDraft(contact));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(contact?.image_url ?? null);
  const [imageError, setImageError] = useState("");
  useEffect(
    () => () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );
  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setImageError(
        "Choose a JPG, PNG, or WebP image that is 5 MB or smaller.",
      );
      event.target.value = "";
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setDraft((current) => ({ ...current, imageUrl: "" }));
    setImageError("");
  }
  const updatePerson = (index: number, patch: Partial<ContactDraftPerson>) =>
    setDraft((current) => ({
      ...current,
      people: current.people.map((person, personIndex) =>
        personIndex === index ? { ...person, ...patch } : person,
      ),
    }));
  const valid =
    Boolean(draft.displayName.trim()) &&
    draft.people.every((person) => person.full_name.trim());

  return (
    <Modal
      open={open}
      setIsOpen={(next) => !next && onClose()}
      title={contact ? `Edit ${contact.display_name}` : "Add an organization"}
      description="Manage the organization and the people you know there."
      size="xl"
      maxHeight="min(48rem, calc(100dvh - 2rem))"
      hideActions
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={editorFormId}
            loading={saving}
            loadingText="Saving…"
            disabled={!valid || saving}
          >
            {contact ? "Save organization" : "Add organization"}
          </Button>
        </div>
      }
    >
      <form
        id={editorFormId}
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onSave(draft, imageFile);
        }}
      >
        <section className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.025] sm:p-6">
          <div className="grid items-start gap-6 sm:grid-cols-[8rem_minmax(0,1fr)] lg:gap-8">
            <div className="flex flex-col items-start gap-3">
              <div
                role="img"
                aria-label="Organization image preview"
                className="grid aspect-square w-24 place-items-center rounded-2xl border border-black/10 bg-white bg-cover bg-center text-xl font-semibold text-black/50 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white/50 sm:w-32"
                style={
                  imagePreview
                    ? {
                        backgroundImage: `url(${JSON.stringify(imagePreview)})`,
                      }
                    : undefined
                }
              >
                {!imagePreview &&
                  (draft.displayName.trim().slice(0, 2).toUpperCase() || "ORG")}
              </div>
              <label
                htmlFor="organization-image"
                className="inline-flex w-24 cursor-pointer items-center justify-center rounded-lg border border-black/20 bg-white/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition hover:bg-black/5 focus-within:ring-2 focus-within:ring-black/30 dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:ring-white/30 sm:w-32"
              >
                {imagePreview ? "Change image" : "Upload image"}
                <input
                  id="organization-image"
                  name="organization-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={selectImage}
                />
              </label>
              <p className="max-w-32 text-xs leading-relaxed text-black/50 dark:text-white/50">
                JPG, PNG, or WebP. 5 MB max.
              </p>
            </div>
            <div className="w-full min-w-0 space-y-5">
              <div>
                <Input
                  label="Organization name"
                  name="contact-display-name"
                  required
                  value={draft.displayName}
                  maxLength={160}
                  placeholder="Brand, venue, company, team, or group"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Input
                  label="Direct image URL"
                  name="organization-image-url"
                  type="text"
                  value={draft.imageUrl}
                  maxLength={2048}
                  placeholder="https://example.com/logo.png"
                  error={Boolean(imageError)}
                  onChange={(event) => {
                    setImageFile(null);
                    setDraft((current) => ({
                      ...current,
                      imageUrl: event.target.value,
                    }));
                    setImagePreview(event.target.value || null);
                    setImageError("");
                  }}
                />
              </div>
              {imageError && (
                <p
                  role="alert"
                  className="text-xs text-red-600 dark:text-red-400"
                >
                  {imageError}
                </p>
              )}
              <div className="max-w-3xl">
                <Textarea
                  id="contact-notes"
                  name="contact-notes"
                  label="Description"
                  value={draft.notes}
                  maxLength={5000}
                  rows={3}
                  placeholder="Add context about the organization or relationship"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">
                People
              </h2>
              <p className="mt-1 text-xs text-black/55 dark:text-white/55">
                Add the individual contacts you know at this organization.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<FiPlus />}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  people: [...current.people, blankPerson()],
                }))
              }
            >
              Add person
            </Button>
          </div>
          {draft.people.length === 0 && (
            <p className="rounded-xl border border-dashed border-black/15 px-4 py-6 text-center text-sm text-black/55 dark:border-white/15 dark:text-white/55">
              No people added yet. You can save the organization now and add
              people whenever you have them.
            </p>
          )}
          {draft.people.map((person, index) => (
            <DisclosureCard
              key={person.id ?? index}
              className="rounded-xl border border-black/10 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.04]"
              buttonClassName="flex w-full items-center justify-between gap-4 text-left"
              panelClassName="pt-4"
              defaultOpen={!person.id}
              summary={
                <span className="block min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-black/55 dark:text-white/55">
                    Person {index + 1}
                  </span>
                  <span className="mt-1 block truncate text-sm font-semibold">
                    {person.full_name.trim() || "New person"}
                  </span>
                </span>
              }
              actions={
                <div
                  className="mr-8"
                  onClick={(event) => event.stopPropagation()}
                >
                  <IconButton
                    label={`Remove person ${index + 1}`}
                    variant="danger"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        people: current.people.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <FiTrash2 aria-hidden />
                  </IconButton>
                </div>
              }
            >
              <div className="grid gap-4 lg:grid-cols-3">
                <Input
                  label="Name"
                  name={`person-${index}-name`}
                  required
                  value={person.full_name}
                  maxLength={160}
                  onChange={(event) =>
                    updatePerson(index, { full_name: event.target.value })
                  }
                />
                <Input
                  label="Phone number"
                  name={`person-${index}-phone`}
                  value={person.phone ?? ""}
                  maxLength={40}
                  inputMode="tel"
                  onChange={(event) =>
                    updatePerson(index, { phone: event.target.value })
                  }
                />
                <Input
                  label="Instagram handle"
                  name={`person-${index}-instagram`}
                  value={person.instagram_handle ?? ""}
                  maxLength={100}
                  placeholder="@handle"
                  onChange={(event) =>
                    updatePerson(index, {
                      instagram_handle: event.target.value,
                    })
                  }
                />
              </div>
              <div className="mt-4">
                <Input
                  label="Email address"
                  name={`person-${index}-email`}
                  type="email"
                  value={person.emails[0] ?? ""}
                  maxLength={254}
                  placeholder="name@example.com"
                  onChange={(event) =>
                    updatePerson(index, {
                      emails: event.target.value ? [event.target.value] : [],
                    })
                  }
                />
              </div>
            </DisclosureCard>
          ))}
        </section>
      </form>
    </Modal>
  );
}
