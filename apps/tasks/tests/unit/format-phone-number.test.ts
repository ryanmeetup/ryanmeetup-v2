import { describe, expect, it } from "vitest";
import { formatPhoneNumber } from "@ryanmeetup/utils";

describe("formatPhoneNumber", () => {
  it("returns an empty string for empty input", () => {
    expect(formatPhoneNumber("")).toBe("");
  });

  it("formats progressively as digits are typed", () => {
    expect(formatPhoneNumber("5")).toBe("(5");
    expect(formatPhoneNumber("555")).toBe("(555");
    expect(formatPhoneNumber("5551")).toBe("(555) 1");
    expect(formatPhoneNumber("555123")).toBe("(555) 123");
    expect(formatPhoneNumber("5551234")).toBe("(555) 123-4");
    expect(formatPhoneNumber("5551234567")).toBe("(555) 123-4567");
  });

  it("strips non-digit characters before formatting", () => {
    expect(formatPhoneNumber("(555) 123-4567")).toBe("(555) 123-4567");
    expect(formatPhoneNumber("555.123.4567")).toBe("(555) 123-4567");
  });

  it("recognizes a leading US country code", () => {
    expect(formatPhoneNumber("15551234567")).toBe("+1 (555) 123-4567");
    expect(formatPhoneNumber("1-555-123-4567")).toBe("+1 (555) 123-4567");
  });

  it("leaves numbers that don't fit the US pattern unchanged", () => {
    expect(formatPhoneNumber("+44 20 7946 0958")).toBe("+44 20 7946 0958");
  });
});
