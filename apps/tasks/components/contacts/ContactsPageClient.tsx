"use client";

import { useMemo, useState } from "react";
import { useSearchFilter } from "@ryanmeetup/hooks";
import {
  AnimatedCollapse,
  Button,
  ConfirmationDialog,
  EmptyState,
  IconButton,
  Input,
  Modal,
  toast,
} from "@ryanmeetup/ui";
import {
  FiChevronDown,
  FiEdit2,
  FiInstagram,
  FiLoader,
  FiMail,
  FiPhone,
  FiPlus,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import { WorkspacePageShell } from "@/components/global";
import { createClient } from "@/lib/supabase/client";
import type { Contact, ContactDraft } from "@/lib/contact-types";
import { mutate } from "@/lib/mutation-client";
import type { WorkspaceData } from "@/lib/workspace-types";
import { ContactEditor } from "./ContactEditor";

function contactSearchText(contact: Contact) {
  return [
    contact.display_name,
    contact.notes,
    ...contact.categories.map((category) => category.name),
    ...contact.people.flatMap((person) => [
      person.full_name,
      ...person.emails,
      person.phone,
      person.instagram_handle,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function ContactsPageClient({
  initialData,
  initialContacts,
  demoMode,
}: {
  initialData: WorkspaceData;
  initialContacts: Contact[];
  demoMode: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [contacts, setContacts] = useState(initialContacts);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null | undefined>();
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingPending, setDeletingPending] = useState(false);
  const [expandedPeopleIds, setExpandedPeopleIds] = useState<Set<string>>(
    () => new Set(),
  );

  function togglePeople(contactId: string) {
    setExpandedPeopleIds((current) => {
      const next = new Set(current);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  }

  const {
    query,
    setQuery,
    filtered: searchedContacts,
    isPending: searchPending,
  } = useSearchFilter({
    data: contacts,
    buildHaystack: contactSearchText,
    queryParam: "contact-search",
  });
  const sortedContacts = useMemo(
    () =>
      [...searchedContacts].sort((a, b) =>
        a.display_name.localeCompare(b.display_name),
      ),
    [searchedContacts],
  );

  async function saveContact(draft: ContactDraft, imageFile: File | null) {
    setSaving(true);
    try {
      let result: { contact: Contact };
      let imageUrl = draft.imageUrl;
      if (imageFile && !demoMode) {
        const extension =
          imageFile.type.split("/")[1] === "jpeg"
            ? "jpg"
            : imageFile.type.split("/")[1];
        const path = `${data.currentProfile.id}/${crypto.randomUUID()}.${extension}`;
        const storage = createClient().storage.from("organization-images");
        const uploaded = await storage.upload(path, imageFile, {
          contentType: imageFile.type,
          cacheControl: "31536000",
        });
        if (uploaded.error) throw uploaded.error;
        imageUrl = storage.getPublicUrl(path).data.publicUrl;
      }
      if (demoMode) {
        const now = new Date().toISOString();
        result = {
          contact: {
            id: draft.id ?? crypto.randomUUID(),
            display_name: draft.displayName.trim(),
            image_url: imageFile
              ? URL.createObjectURL(imageFile)
              : imageUrl || null,
            notes: draft.notes.trim() || null,
            created_at: editing?.created_at ?? now,
            updated_at: now,
            categories: editing?.categories ?? [],
            people: draft.people.map((person) => ({
              ...person,
              id: person.id ?? crypto.randomUUID(),
              full_name: person.full_name.trim(),
              emails: person.emails.map((email) => email.trim().toLowerCase()),
              phone: person.phone?.trim() || null,
              instagram_handle:
                person.instagram_handle?.trim().replace(/^@/, "") || null,
            })),
          },
        };
      } else {
        result = await mutate("/api/contacts", {
          method: draft.id ? "PATCH" : "POST",
          body: JSON.stringify({ ...draft, imageUrl }),
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
      setEditing(undefined);
      toast.success(draft.id ? "Organization updated." : "Organization added.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The organization could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact() {
    if (!deleting) return;
    setDeletingPending(true);
    try {
      if (!demoMode)
        await mutate("/api/contacts", {
          method: "DELETE",
          body: JSON.stringify({ id: deleting.id }),
        });
      setContacts((current) =>
        current.filter((contact) => contact.id !== deleting.id),
      );
      setDeleting(null);
      toast.success("Organization deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The organization could not be deleted.",
      );
    } finally {
      setDeletingPending(false);
    }
  }

  return (
    <>
      <WorkspacePageShell
        data={data}
        setData={setData}
        demoMode={demoMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        contentClassName="p-3 sm:p-6 lg:p-6 xl:p-8"
      >
        <Modal
          open
          setIsOpen={() => undefined}
          title="Organizations"
          description="Browse the brands, venues, sponsors, teams, and groups we know, with the right people organized under each one."
          actions={
            <Button
              type="button"
              variant="action"
              size="sm"
              className="w-full sm:w-auto"
              leftIcon={<FiPlus aria-hidden />}
              onClick={() => setEditing(null)}
            >
              New organization
            </Button>
          }
          hideActions
          size="xl"
          embedded
        >
          <div className="sticky top-0 z-20 -mx-1 mb-4 bg-white px-1 pb-3 dark:bg-[#181818]">
            <div className="relative">
              <Input
                label="Search organizations"
                name="contact-search"
                hideLabel
                leadingIcon={<FiSearch aria-hidden />}
                aria-busy={searchPending}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search organizations and people..."
                inputClassName="pr-10"
              />
              {searchPending && (
                <span
                  role="status"
                  aria-label="Loading organization results"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/45 dark:text-white/45"
                >
                  <FiLoader className="animate-spin motion-reduce:animate-none" />
                </span>
              )}
            </div>
          </div>
          <div className="relative" aria-busy={searchPending}>
            {searchPending && (
              <div
                role="status"
                aria-label="Loading organization results"
                className="absolute inset-0 z-10 grid min-h-40 place-items-center rounded-xl bg-white/80 backdrop-blur-sm dark:bg-[#181818]/80"
              >
                <span className="flex items-center gap-3 rounded-xl border border-black/15 bg-white px-5 py-3 text-sm font-semibold shadow-lg dark:border-white/15 dark:bg-[#181818]">
                  <FiLoader className="h-5 w-5 animate-spin motion-reduce:animate-none" />
                  Loading organizations
                </span>
              </div>
            )}
            <div
              className={
                searchPending
                  ? "pointer-events-none opacity-55 transition-opacity"
                  : "transition-opacity"
              }
            >
              {sortedContacts.length === 0 ? (
                <EmptyState
                  className="py-12"
                  message={
                    contacts.length === 0
                      ? "No organizations yet. Add one using the button above."
                      : "No organizations or people match that search."
                  }
                />
              ) : (
                <div className="columns-1 gap-4 md:columns-2 2xl:columns-3">
                  {sortedContacts.map((contact) => (
                    <article
                      key={contact.id}
                      className="mb-4 inline-block w-full break-inside-avoid rounded-2xl border border-black/10 bg-white/90 p-5 align-top shadow-sm dark:border-white/10 dark:bg-white/[0.055]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              role="img"
                              aria-label={`${contact.display_name} image`}
                              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-black/10 bg-black/5 bg-cover bg-center text-sm font-semibold text-black/50 dark:border-white/10 dark:bg-white/10 dark:text-white/50"
                              style={
                                contact.image_url
                                  ? {
                                      backgroundImage: `url(${JSON.stringify(contact.image_url)})`,
                                    }
                                  : undefined
                              }
                            >
                              {!contact.image_url &&
                                contact.display_name.slice(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <h2 className="truncate text-lg font-semibold">
                                {contact.display_name}
                              </h2>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <IconButton
                            label={`Edit “${contact.display_name}”`}
                            onClick={() => setEditing(contact)}
                          >
                            <FiEdit2 />
                          </IconButton>
                          <IconButton
                            label={`Delete “${contact.display_name}”`}
                            onClick={() => setDeleting(contact)}
                          >
                            <FiTrash2 />
                          </IconButton>
                        </div>
                      </div>
                      {contact.notes && (
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-black/65 dark:text-white/65">
                          {contact.notes}
                        </p>
                      )}
                      <div className="mt-5 border-t border-black/10 dark:border-white/10">
                        <button
                          type="button"
                          aria-expanded={expandedPeopleIds.has(contact.id)}
                          aria-controls={`organization-people-${contact.id}`}
                          onClick={() => togglePeople(contact.id)}
                          className="flex w-full items-center gap-2 rounded-lg py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/65 transition hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:text-white/65 dark:hover:text-white dark:focus-visible:ring-white/30"
                        >
                          <span>People</span>
                          <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] tracking-normal dark:bg-white/10">
                            {contact.people.length}
                          </span>
                          <FiChevronDown
                            aria-hidden
                            className={`ml-auto transition-transform duration-200 motion-reduce:transition-none ${expandedPeopleIds.has(contact.id) ? "rotate-180" : ""}`}
                          />
                        </button>
                        <AnimatedCollapse
                          id={`organization-people-${contact.id}`}
                          open={expandedPeopleIds.has(contact.id)}
                        >
                          <div className="grid divide-y divide-black/10 border-t border-black/10 md:grid-cols-2 md:gap-x-8 md:divide-y-0 dark:divide-white/10 dark:border-white/10">
                            {contact.people.length === 0 ? (
                              <p className="py-4 text-sm text-black/50 dark:text-white/50">
                                No people added yet.
                              </p>
                            ) : (
                              contact.people.map((person) => (
                                <div key={person.id} className="py-4 last:pb-0">
                                  <p className="font-semibold">
                                    {person.full_name}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-black/65 dark:text-white/65">
                                    {person.emails.slice(0, 1).map((email) => (
                                      <a
                                        key={email}
                                        className="inline-flex items-center gap-1.5 hover:text-black dark:hover:text-white"
                                        href={`mailto:${email}`}
                                      >
                                        <FiMail aria-hidden />
                                        {email}
                                      </a>
                                    ))}
                                    {person.phone && (
                                      <a
                                        className="inline-flex items-center gap-1.5 hover:text-black dark:hover:text-white"
                                        href={`tel:${person.phone}`}
                                      >
                                        <FiPhone aria-hidden />
                                        {person.phone}
                                      </a>
                                    )}
                                    {person.instagram_handle && (
                                      <a
                                        className="inline-flex items-center gap-1.5 hover:text-black dark:hover:text-white"
                                        href={`https://instagram.com/${person.instagram_handle}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <FiInstagram aria-hidden />@
                                        {person.instagram_handle}
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </AnimatedCollapse>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      </WorkspacePageShell>

      {editing !== undefined && (
        <ContactEditor
          key={editing?.id ?? "new"}
          contact={editing}
          open
          saving={saving}
          onClose={() => setEditing(undefined)}
          onSave={(draft, imageFile) => void saveContact(draft, imageFile)}
        />
      )}
      <ConfirmationDialog
        open={Boolean(deleting)}
        setOpen={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.display_name ?? "this organization"}?`}
        description="This permanently removes the organization and every person saved beneath it."
        confirmLabel="Delete organization"
        pending={deletingPending}
        destructive
        onConfirm={() => void deleteContact()}
      />
    </>
  );
}
