import { afterEach, describe, expect, it, vi } from "vitest";
import { databaseFailure } from "@/lib/server/api-response";

function request(requestId = "valid_request_123") {
  return new Request("http://localhost/api/example", {
    headers: { "x-request-id": requestId },
  });
}

describe("databaseFailure", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["23505", 409, "CONFLICT", "That name is already used."],
    ["40001", 409, "CONFLICT", "That name is already used."],
    ["23503", 400, "INVALID_REQUEST", "Some of the submitted information"],
    ["23514", 400, "INVALID_REQUEST", "Some of the submitted information"],
    ["22P02", 400, "INVALID_REQUEST", "Some of the submitted information"],
    ["42501", 403, "FORBIDDEN", "You do not have permission"],
    ["PGRST301", 403, "FORBIDDEN", "You do not have permission"],
  ])(
    "maps database code %s to a safe API response",
    async (databaseCode, status, code, message) => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);

      const response = databaseFailure(
        request(),
        "example.save",
        { code: databaseCode, message: "sensitive database detail" },
        {
          error: "The item could not be saved.",
          conflictError: "That name is already used.",
        },
      );
      const body = await response.json();

      expect(response.status).toBe(status);
      expect(body).toMatchObject({ code, requestId: "valid_request_123" });
      expect(body.error).toContain(message);
      expect(body.error).not.toContain("sensitive database detail");
      expect(response.headers.get("x-request-id")).toBe("valid_request_123");
    },
  );

  it("generates a request ID when the supplied value is unsafe", async () => {
    const errorLog = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = databaseFailure(
      request("bad id with spaces"),
      "example.delete",
      { message: "database unavailable" },
      { error: "The item could not be deleted." },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      code: "OPERATION_FAILED",
      error: "The item could not be deleted.",
    });
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(errorLog).toHaveBeenCalledWith(
      "Database operation failed",
      expect.objectContaining({
        requestId: body.requestId,
        operation: "example.delete",
        message: "database unavailable",
      }),
    );
  });
});
