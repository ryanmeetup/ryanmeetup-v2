"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useSearchFilter } from "@ryanmeetup/hooks";
import { normalizeHttpUrl } from "@ryanmeetup/utils";
import { Button, IconButton, Input, Modal, Textarea } from "@ryanmeetup/ui";
import {
  FiBriefcase,
  FiEdit2,
  FiInstagram,
  FiLoader,
  FiMail,
  FiPhone,
  FiPlus,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import type {
  Contact,
  ContactDraft,
  ContactDraftPerson,
} from "@/lib/contact-types";
import { CountBadge } from "@/components/global";

const blankPerson = (): ContactDraftPerson => ({
  full_name: "",
  title: null,
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
  const [activePersonIndex, setActivePersonIndex] = useState<number | null>(
    null,
  );
  const [personBeforeEdit, setPersonBeforeEdit] =
    useState<ContactDraftPerson | null>(null);
  const [removePersonOnCancel, setRemovePersonOnCancel] = useState(false);
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
    !imageError &&
    Boolean(draft.displayName.trim()) &&
    draft.people.every((person) => person.full_name.trim());
  const indexedPeople = useMemo(
    () => draft.people.map((person, index) => ({ person, index })),
    [draft.people],
  );
  const {
    query: peopleQuery,
    setQuery: setPeopleQuery,
    filtered: visiblePeople,
    isPending: peopleSearchPending,
  } = useSearchFilter({
    data: indexedPeople,
    queryParam: "contactPerson",
    buildHaystack: ({ person }) =>
      [
        person.full_name,
        person.title,
        person.emails[0],
        person.phone,
        person.instagram_handle,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
  });
  const filteredPeople =
    draft.people.length >= 8 ? visiblePeople : indexedPeople;
  const displayedPeople = filteredPeople;
  const activePerson =
    activePersonIndex === null ? null : draft.people[activePersonIndex];

  function removePerson(index: number) {
    setDraft((current) => ({
      ...current,
      people: current.people.filter((_, personIndex) => personIndex !== index),
    }));
    setActivePersonIndex((current) => {
      if (current === null || current === index) return null;
      return current > index ? current - 1 : current;
    });
    if (activePersonIndex === index) setPersonBeforeEdit(null);
  }

  function cancelPersonEdit() {
    if (activePersonIndex === null) return;

    if (!removePersonOnCancel && personBeforeEdit) {
      updatePerson(activePersonIndex, personBeforeEdit);
      setActivePersonIndex(null);
    } else {
      removePerson(activePersonIndex);
    }
    setPersonBeforeEdit(null);
    setRemovePersonOnCancel(false);
  }

  return (
    <Modal
      open={open}
      setIsOpen={(next) => !next && !saving && onClose()}
      title={contact ? `Edit ${contact.display_name}` : "New organization"}
      description="Manage the organization and the people you know there."
      size="xl"
      maxHeight="min(48rem, calc(100dvh - 2rem))"
      hideActions
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={editorFormId}
            size="sm"
            loading={saving}
            loadingText={contact ? "Saving…" : "Creating…"}
            disabled={!valid || saving}
          >
            {contact ? "Save changes" : "Create organization"}
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
                  disabled={saving}
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
                  autoFocus
                  disabled={saving}
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
                  disabled={saving}
                  onBlur={() => {
                    if (!draft.imageUrl.trim()) return;
                    const normalized = normalizeHttpUrl(draft.imageUrl);
                    if (!normalized) {
                      setImageError("Enter a valid HTTP or HTTPS image URL.");
                      return;
                    }
                    setDraft((current) => ({
                      ...current,
                      imageUrl: normalized,
                    }));
                    setImagePreview(normalized);
                    setImageError("");
                  }}
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
                  disabled={saving}
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
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em]">
                People <CountBadge>{draft.people.length}</CountBadge>
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
              disabled={activePersonIndex !== null || saving}
              onClick={() => {
                setPeopleQuery("");
                setPersonBeforeEdit(null);
                setRemovePersonOnCancel(true);
                setDraft((current) => ({
                  ...current,
                  people: [...current.people, blankPerson()],
                }));
                setActivePersonIndex(draft.people.length);
              }}
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
          {activePerson && activePersonIndex !== null && (
            <div className="rounded-xl border border-black/10 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/55 dark:text-white/55">
                    {activePerson.id ? "Edit person" : "New person"}
                  </p>
                  <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                    Add their name and the best way to reach them.
                  </p>
                </div>
                <IconButton
                  label={`Remove ${activePerson.full_name.trim() || `person ${activePersonIndex + 1}`}`}
                  variant="danger"
                  disabled={saving}
                  onClick={() => removePerson(activePersonIndex)}
                >
                  <FiTrash2 aria-hidden />
                </IconButton>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Input
                  label="Name"
                  name={`person-${activePersonIndex}-name`}
                  required
                  autoFocus={!activePerson.id}
                  disabled={saving}
                  value={activePerson.full_name}
                  maxLength={160}
                  onChange={(event) =>
                    updatePerson(activePersonIndex, {
                      full_name: event.target.value,
                    })
                  }
                />
                <Input
                  label="Email address"
                  name={`person-${activePersonIndex}-email`}
                  type="email"
                  disabled={saving}
                  value={activePerson.emails[0] ?? ""}
                  maxLength={254}
                  placeholder="name@example.com"
                  onChange={(event) =>
                    updatePerson(activePersonIndex, {
                      emails: event.target.value ? [event.target.value] : [],
                    })
                  }
                />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <Input
                  label="Title"
                  name={`person-${activePersonIndex}-title`}
                  value={activePerson.title ?? ""}
                  maxLength={160}
                  placeholder="Partnerships manager"
                  disabled={saving}
                  onChange={(event) =>
                    updatePerson(activePersonIndex, {
                      title: event.target.value,
                    })
                  }
                />
                <Input
                  label="Phone number"
                  name={`person-${activePersonIndex}-phone`}
                  value={activePerson.phone ?? ""}
                  maxLength={40}
                  inputMode="tel"
                  disabled={saving}
                  onChange={(event) =>
                    updatePerson(activePersonIndex, {
                      phone: event.target.value,
                    })
                  }
                />
                <Input
                  label="Instagram handle"
                  name={`person-${activePersonIndex}-instagram`}
                  value={activePerson.instagram_handle ?? ""}
                  maxLength={100}
                  placeholder="@handle"
                  disabled={saving}
                  onChange={(event) =>
                    updatePerson(activePersonIndex, {
                      instagram_handle: event.target.value,
                    })
                  }
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={saving}
                  onClick={cancelPersonEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!activePerson.full_name.trim() || saving}
                  onClick={() => {
                    setActivePersonIndex(null);
                    setPersonBeforeEdit(null);
                    setRemovePersonOnCancel(false);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
          {draft.people.length >= 8 && (
            <div className="relative">
              <Input
                label="Search people"
                name="people-search"
                hideLabel
                leadingIcon={<FiSearch aria-hidden />}
                aria-busy={peopleSearchPending}
                value={peopleQuery}
                onChange={(event) => setPeopleQuery(event.target.value)}
                placeholder="Search people…"
                inputClassName="pr-10"
                disabled={saving}
              />
              {peopleSearchPending && (
                <span
                  role="status"
                  aria-label="Loading people results"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/45 dark:text-white/45"
                >
                  <FiLoader className="animate-spin motion-reduce:animate-none" />
                </span>
              )}
            </div>
          )}
          <div
            className="grid grid-cols-1 gap-2 lg:grid-cols-2"
            aria-busy={peopleSearchPending}
          >
            {displayedPeople
              .filter(({ index }) => index !== activePersonIndex)
              .map(({ person, index }) => (
                <div
                  key={person.id ?? index}
                  className="rounded-xl border border-black/10 bg-black/[0.025] dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="flex min-w-0 items-center gap-3 p-3 sm:p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {person.full_name.trim() || "New person"}
                      </p>
                      {person.title && (
                        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-black/55 dark:text-white/55">
                          <FiBriefcase aria-hidden className="shrink-0" />
                          <span className="truncate">{person.title}</span>
                        </p>
                      )}
                      <div className="mt-1 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs text-black/60 dark:text-white/60">
                        {person.emails[0] && (
                          <span className="flex min-w-0 items-center gap-1.5">
                            <FiMail aria-hidden className="shrink-0" />
                            <span className="truncate">{person.emails[0]}</span>
                          </span>
                        )}
                        {person.phone && (
                          <span className="flex min-w-0 items-center gap-1.5">
                            <FiPhone aria-hidden className="shrink-0" />
                            <span className="truncate">{person.phone}</span>
                          </span>
                        )}
                        {person.instagram_handle && (
                          <span className="flex min-w-0 items-center gap-1.5">
                            <FiInstagram aria-hidden className="shrink-0" />
                            <span className="truncate">
                              @{person.instagram_handle.replace(/^@/, "")}
                            </span>
                          </span>
                        )}
                        {!person.emails[0] &&
                          !person.phone &&
                          !person.instagram_handle && (
                            <span>No contact details</span>
                          )}
                      </div>
                    </div>
                    <IconButton
                      label={`Edit ${person.full_name.trim() || `person ${index + 1}`}`}
                      onClick={() => {
                        setPersonBeforeEdit({
                          ...person,
                          emails: [...person.emails],
                        });
                        setRemovePersonOnCancel(false);
                        setActivePersonIndex(index);
                      }}
                      disabled={saving}
                    >
                      <FiEdit2 aria-hidden />
                    </IconButton>
                    <IconButton
                      label={`Remove ${person.full_name.trim() || `person ${index + 1}`}`}
                      variant="danger"
                      disabled={saving}
                      onClick={() => removePerson(index)}
                    >
                      <FiTrash2 aria-hidden />
                    </IconButton>
                  </div>
                </div>
              ))}
          </div>
          {draft.people.length > 0 &&
            displayedPeople.filter(({ index }) => index !== activePersonIndex)
              .length === 0 &&
            !activePerson && (
              <p className="rounded-xl border border-dashed border-black/15 px-4 py-6 text-center text-sm text-black/55 dark:border-white/15 dark:text-white/55">
                No people match that search.
              </p>
            )}
        </section>
      </form>
    </Modal>
  );
}
