import { describe, expect, it } from "vitest";
import {
  contactEditPath,
  contactRouteId,
  contactSlug,
  findContactByRouteId,
} from "@/lib/contacts/contact-slug";

const lantern = { id: "8f1c-a", display_name: "The Lantern Room" };
const northside = { id: "2b40-b", display_name: "Northside Coffee Co." };
const harborOne = { id: "c9d1-c", display_name: "Harbor Hall" };
const harborTwo = { id: "51ae-d", display_name: "Harbor Hall" };
const contacts = [lantern, northside, harborOne, harborTwo];

describe("contactSlug", () => {
  it("reads a display name as words joined by hyphens", () => {
    expect(contactSlug("The Lantern Room")).toBe("the-lantern-room");
    expect(contactSlug("Northside Coffee Co.")).toBe("northside-coffee-co");
    expect(contactSlug("Café Lumière & Co")).toBe("cafe-lumiere-co");
  });

  it("has nothing to offer a name with no letters or digits", () => {
    expect(contactSlug("日本語")).toBe("");
    expect(contactSlug("— —")).toBe("");
  });
});

describe("contactRouteId", () => {
  it("names a contact by its slug", () => {
    expect(contactRouteId(lantern, contacts)).toBe("the-lantern-room");
    expect(contactEditPath(northside, contacts)).toBe(
      "/contacts/northside-coffee-co/edit",
    );
  });

  it("keeps the id when two contacts share a display name", () => {
    expect(contactRouteId(harborOne, contacts)).toBe("c9d1-c");
    expect(contactRouteId(harborTwo, contacts)).toBe("51ae-d");
  });

  it("keeps the id when the name does not slugify", () => {
    const unnamed = { id: "0f22-e", display_name: "日本語" };
    expect(contactRouteId(unnamed, [...contacts, unnamed])).toBe("0f22-e");
  });
});

describe("findContactByRouteId", () => {
  it("resolves a slug", () => {
    expect(findContactByRouteId(contacts, "the-lantern-room")).toBe(lantern);
  });

  it("still resolves an id, which is what a duplicated name is linked by", () => {
    expect(findContactByRouteId(contacts, "51ae-d")).toBe(harborTwo);
  });

  it("refuses to guess between two contacts sharing a slug", () => {
    expect(findContactByRouteId(contacts, "harbor-hall")).toBeUndefined();
  });

  it("resolves nothing for a contact the viewer cannot read", () => {
    expect(findContactByRouteId(contacts, "the-quiet-annex")).toBeUndefined();
  });

  it("round-trips every contact it can reach", () => {
    for (const contact of contacts) {
      expect(
        findContactByRouteId(contacts, contactRouteId(contact, contacts)),
      ).toBe(contact);
    }
  });
});
