import { describe, expect, it } from "vitest";
import { formatInstagramHandle } from "@ryanmeetup/utils";

describe("formatInstagramHandle", () => {
  it("returns an empty string for empty input", () => {
    expect(formatInstagramHandle("")).toBe("");
    expect(formatInstagramHandle("   ")).toBe("");
  });

  it("passes through a raw username", () => {
    expect(formatInstagramHandle("ryanmeetup")).toBe("ryanmeetup");
  });

  it("strips a leading @", () => {
    expect(formatInstagramHandle("@ryanmeetup")).toBe("ryanmeetup");
  });

  it("extracts the username from a profile link", () => {
    expect(formatInstagramHandle("https://instagram.com/ryanmeetup")).toBe(
      "ryanmeetup",
    );
    expect(
      formatInstagramHandle("https://www.instagram.com/ryanmeetup"),
    ).toBe("ryanmeetup");
    expect(formatInstagramHandle("http://www.instagram.com/ryanmeetup")).toBe(
      "ryanmeetup",
    );
    expect(formatInstagramHandle("www.instagram.com/ryanmeetup")).toBe(
      "ryanmeetup",
    );
    expect(formatInstagramHandle("instagram.com/ryanmeetup")).toBe(
      "ryanmeetup",
    );
  });

  it("drops a trailing slash or query string from a link", () => {
    expect(formatInstagramHandle("https://instagram.com/ryanmeetup/")).toBe(
      "ryanmeetup",
    );
    expect(
      formatInstagramHandle("https://instagram.com/ryanmeetup?hl=en"),
    ).toBe("ryanmeetup");
  });

  it("trims surrounding whitespace", () => {
    expect(formatInstagramHandle("  @ryanmeetup  ")).toBe("ryanmeetup");
  });
});
