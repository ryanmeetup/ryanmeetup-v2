import { describe, expect, it } from "vitest";
import {
  diffTextKeys,
  draftForKeys,
  identityFields,
  validateTextFields,
  type InstanceDraft,
  type InstanceTextKey,
} from "@/lib/admin/instance-settings-fields";

const keys = identityFields.map((field) => field.key);

describe("settings dialog drafts", () => {
  it("seeds blanks where the instance inherits, values where it overrides", () => {
    expect(draftForKeys(keys, { name: "Acme" })).toEqual({
      name: "Acme",
      productName: "",
      tagline: "",
      description: "",
    });
    expect(draftForKeys(keys, null)).toEqual({
      name: "",
      productName: "",
      tagline: "",
      description: "",
    });
  });

  it("sends only what changed, and nulls a field that was emptied", () => {
    const stored = { name: "Acme", tagline: "Tracker" };
    const draft = draftForKeys(keys, stored);
    draft.name = "Acme Collective";
    // Clearing a field drops the override so the build default applies again.
    draft.tagline = "  ";

    expect(diffTextKeys(keys, draft, stored)).toEqual({
      name: "Acme Collective",
      tagline: null,
    });
  });

  it("treats an unchanged draft as nothing to save", () => {
    const stored = { name: "Acme" };
    expect(diffTextKeys(keys, draftForKeys(keys, stored), stored)).toEqual({});
  });

  it("scopes a diff to the dialog's own keys", () => {
    // The footer dialog must never write identity columns, even though the
    // stored row it was seeded from contains them.
    const footerKeys: InstanceTextKey[] = ["footerSubtitle"];
    const draft = { footerSubtitle: "Est. 2019" } as InstanceDraft;
    expect(diffTextKeys(footerKeys, draft, { name: "Acme" })).toEqual({
      footerSubtitle: "Est. 2019",
    });
  });

  it("reports per-field problems and ignores blanks", () => {
    const draft = draftForKeys(keys, null);
    draft.name = "x".repeat(81);
    expect(validateTextFields(identityFields, draft)).toEqual({
      name: "Keep this to 80 characters or fewer.",
    });
    expect(validateTextFields(identityFields, draftForKeys(keys, null))).toEqual(
      {},
    );
  });
});
