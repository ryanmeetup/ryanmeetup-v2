import { describe, expect, it } from "vitest";
import { demoPreviewSchema } from "@/lib/api-schema";
import {
  DEMO_PREVIEW_COOKIE,
  DEMO_PREVIEW_MAX_AGE_SECONDS,
  DEMO_PREVIEW_VALUE,
} from "@/lib/demo-preview";

describe("demoPreviewSchema", () => {
  it("accepts either state of the toggle", () => {
    expect(demoPreviewSchema({ enabled: true })).toEqual({ enabled: true });
    expect(demoPreviewSchema({ enabled: false })).toEqual({ enabled: false });
  });

  it("rejects a missing, non-boolean, or truthy-string state", () => {
    // A string body would otherwise turn every value, "false" included, into
    // an instruction to enter the preview.
    expect(demoPreviewSchema({})).toBeNull();
    expect(demoPreviewSchema({ enabled: "false" })).toBeNull();
    expect(demoPreviewSchema({ enabled: 1 })).toBeNull();
    expect(demoPreviewSchema(null)).toBeNull();
  });

  it("rejects unknown keys rather than ignoring them", () => {
    expect(
      demoPreviewSchema({ enabled: true, owner: "someone-else" }),
    ).toBeNull();
  });
});

describe("demo preview cookie", () => {
  it("expires on its own so a forgotten preview does not persist", () => {
    expect(DEMO_PREVIEW_MAX_AGE_SECONDS).toBeGreaterThan(0);
    expect(DEMO_PREVIEW_MAX_AGE_SECONDS).toBeLessThanOrEqual(24 * 60 * 60);
  });

  it("names one cookie and one accepted value", () => {
    // The server compares against DEMO_PREVIEW_VALUE exactly, so anything the
    // browser happens to carry under this name reads as "off".
    expect(DEMO_PREVIEW_COOKIE).toBe("tasks-demo-preview");
    expect(DEMO_PREVIEW_VALUE).toBe("on");
  });
});
