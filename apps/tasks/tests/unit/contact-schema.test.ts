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

  it("normalizes multiple labeled email addresses and phone numbers", () => {
    const result = contactSaveSchema({
      ...contact("Brand Partner"),
      people: [
        {
          full_name: "Jodi",
          title: "Producer",
          emails: [
            { label: " Work ", value: "JODI@EXAMPLE.COM" },
            { label: "Personal", value: "jodi.personal@example.com" },
          ],
          phones: [
            { label: "Work cell", value: "(555) 123-4567" },
            { label: "Office", value: "555-987-6543 ext. 2" },
          ],
          instagram_handle: null,
        },
      ],
    });

    expect(result?.people[0]).toMatchObject({
      emails: [
        { label: "Work", value: "jodi@example.com" },
        { label: "Personal", value: "jodi.personal@example.com" },
      ],
      phones: [
        { label: "Work cell", value: "(555) 123-4567" },
        { label: "Office", value: "555-987-6543 ext. 2" },
      ],
    });
  });

  it("rejects duplicate or malformed contact methods", () => {
    const person = {
      full_name: "Jodi",
      title: null,
      phones: [],
      instagram_handle: null,
    };
    expect(
      contactSaveSchema({
        ...contact("Brand Partner"),
        people: [
          {
            ...person,
            emails: [
              { label: "Work", value: "jodi@example.com" },
              { label: "Personal", value: "JODI@EXAMPLE.COM" },
            ],
          },
        ],
      }),
    ).toBeNull();
    expect(
      contactSaveSchema({
        ...contact("Brand Partner"),
        people: [
          {
            ...person,
            emails: [{ label: "Work", value: "not-an-email" }],
          },
        ],
      }),
    ).toBeNull();
  });
});
