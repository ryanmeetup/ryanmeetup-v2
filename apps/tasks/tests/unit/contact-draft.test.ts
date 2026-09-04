import { describe, expect, it } from "vitest";
import { contactDraftSignature } from "@/lib/contacts/contact-draft";
import type { ContactDraft } from "@/lib/contacts/contact-types";

const saved: ContactDraft = {
  id: "8f1c",
  displayName: "Team Kaskade",
  imageUrl: "https://example.com/logo.png",
  retainImage: false,
  contactGroup: "Talent & Entertainment",
  notes: "Collaborating on Ryan Meetup x Sun Soaked.",
  categoryIds: ["b", "a"],
  newCategoryNames: [],
  people: [
    {
      id: "p1",
      full_name: "Jodi Nelson",
      title: "Media Director",
      emails: [{ label: null, value: "jodi@kaskademusic.com" }],
      phones: [{ label: null, value: "3476612373" }],
      instagram_handle: null,
    },
  ],
};

const edited = (patch: Partial<ContactDraft>): ContactDraft => ({
  ...saved,
  ...patch,
});

const unchanged = (draft: ContactDraft) =>
  contactDraftSignature(draft) === contactDraftSignature(saved);

describe("contactDraftSignature", () => {
  it("reads an untouched draft as unchanged", () => {
    expect(unchanged(edited({}))).toBe(true);
  });

  it("ignores what the save would normalize away", () => {
    expect(unchanged(edited({ displayName: "  Team Kaskade  " }))).toBe(true);
    expect(unchanged(edited({ notes: `${saved.notes}  ` }))).toBe(true);
    expect(unchanged(edited({ categoryIds: ["a", "b"] }))).toBe(true);
    expect(
      unchanged(
        edited({
          people: [
            {
              ...saved.people[0],
              emails: [{ label: null, value: "Jodi@KaskadeMusic.com " }],
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("reads an emptied optional field as its saved null", () => {
    expect(
      unchanged(
        edited({
          people: [
            {
              ...saved.people[0],
              title: "Media Director",
              instagram_handle: "",
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("sees every edit that would reach the database", () => {
    expect(unchanged(edited({ displayName: "Kaskade" }))).toBe(false);
    expect(unchanged(edited({ notes: "" }))).toBe(false);
    expect(unchanged(edited({ contactGroup: "Media & Press" }))).toBe(false);
    expect(unchanged(edited({ imageUrl: "" }))).toBe(false);
    expect(unchanged(edited({ retainImage: true }))).toBe(false);
    expect(unchanged(edited({ categoryIds: ["a"] }))).toBe(false);
    expect(unchanged(edited({ newCategoryNames: ["Music"] }))).toBe(false);
    expect(unchanged(edited({ people: [] }))).toBe(false);
  });

  it("sees a person edited, added, or replaced", () => {
    expect(
      unchanged(
        edited({
          people: [{ ...saved.people[0], title: "Head of Media" }],
        }),
      ),
    ).toBe(false);
    expect(
      unchanged(
        edited({
          people: [
            ...saved.people,
            {
              full_name: "Mahsa Eskandari",
              title: null,
              emails: [],
              phones: [],
              instagram_handle: null,
            },
          ],
        }),
      ),
    ).toBe(false);
    expect(
      unchanged(edited({ people: [{ ...saved.people[0], id: "p2" }] })),
    ).toBe(false);
  });

  it("sees a contact method added, relabeled, or removed", () => {
    const person = saved.people[0];
    expect(
      unchanged(
        edited({
          people: [
            {
              ...person,
              emails: [...person.emails, { label: null, value: "b@c.com" }],
            },
          ],
        }),
      ),
    ).toBe(false);
    expect(
      unchanged(
        edited({
          people: [
            {
              ...person,
              emails: [{ label: "Work", value: "jodi@kaskademusic.com" }],
            },
          ],
        }),
      ),
    ).toBe(false);
    expect(unchanged(edited({ people: [{ ...person, phones: [] }] }))).toBe(
      false,
    );
  });
});
