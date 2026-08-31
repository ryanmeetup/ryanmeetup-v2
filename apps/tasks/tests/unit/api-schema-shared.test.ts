import { describe, expect, it } from "vitest";
import {
  isUuid,
  nullableTrimmedText,
  objectWithKeys,
  optionalTrimmedText,
  parseUuid,
  requiredTrimmedText,
  uuidList,
} from "@/lib/api-schema/shared";

const id = "123e4567-e89b-42d3-a456-426614174000";

describe("shared API schema primitives", () => {
  it("distinguishes required, optional, and nullable trimmed text", () => {
    expect(requiredTrimmedText("  Ryan  ", 10)).toBe("Ryan");
    expect(requiredTrimmedText("   ", 10)).toBeNull();
    expect(optionalTrimmedText(undefined, 10)).toBeUndefined();
    expect(optionalTrimmedText("   ", 10)).toBe("");
    expect(nullableTrimmedText("   ", 10)).toBeNull();
    expect(nullableTrimmedText(undefined, 10)).toBeUndefined();
  });

  it("accepts only plain objects with allowed keys", () => {
    expect(objectWithKeys({ name: "Ryan" }, ["name"])).toEqual({
      name: "Ryan",
    });
    expect(objectWithKeys({ name: "Ryan", extra: true }, ["name"])).toBeNull();
    expect(objectWithKeys([], [])).toBeNull();
  });

  it("uses one strict UUID grammar for values and lists", () => {
    expect(isUuid(id)).toBe(true);
    expect(parseUuid(id)).toBe(id);
    expect(isUuid("123e4567-e89b-02d3-a456-426614174000")).toBe(false);
    expect(isUuid("------------------------------------")).toBe(false);
    expect(uuidList([id, id])).toEqual([id]);
    expect(uuidList([id, "not-a-uuid"])).toBeNull();
  });
});
