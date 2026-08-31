import { describe, expect, it } from "vitest";
import { contactSaveSchema } from "@/lib/contacts/contact-schema";

const contact = (contactGroup: unknown) => ({
  displayName: "Fallen Media",
  imageUrl: "",
  retainImage: false,
  contactGroup,
  notes: "",
  categoryIds: [],
  newCategoryNames: [],
  people: [],
});

describe("contactSaveSchema", () => {
  it("accepts a supported contact group", () => {
    expect(contactSaveSchema(contact("Media & Press"))?.contactGroup).toBe(
      "Media & Press",
    );
  });

  it("normalizes an empty group to uncategorized", () => {
    expect(contactSaveSchema(contact(""))?.contactGroup).toBeNull();
  });

  it("rejects an unsupported contact group", () => {
    expect(contactSaveSchema(contact("News"))).toBeNull();
  });

  it("accepts a request to retain a server-owned image", () => {
    expect(
      contactSaveSchema({ ...contact("Brand Partner"), retainImage: true })
        ?.retainImage,
    ).toBe(true);
  });
});
