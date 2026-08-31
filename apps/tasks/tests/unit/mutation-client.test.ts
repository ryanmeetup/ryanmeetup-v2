import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mutate,
  parseMutationResponse,
} from "@/lib/mutation-client";

describe("mutation responses", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a successful structured response", async () => {
    const response = Response.json({ item: { id: "item-1" } });

    await expect(parseMutationResponse(response)).resolves.toEqual({
      item: { id: "item-1" },
    });
  });

  it("throws the server error code and request ID", async () => {
    const response = Response.json(
      { code: "CONFLICT", error: "That item already exists." },
      {
        status: 409,
        headers: { "x-request-id": "request_12345678" },
      },
    );

    const failure = parseMutationResponse(response);

    await expect(failure).rejects.toMatchObject({
      name: "ApiMutationError",
      message: "That item already exists.",
      code: "CONFLICT",
      requestId: "request_12345678",
    });
  });

  it("uses a safe fallback when an error response omits details", async () => {
    const response = Response.json({}, { status: 500 });

    await expect(parseMutationResponse(response)).rejects.toMatchObject({
      message: "The operation could not be completed. Try again.",
      code: "OPERATION_FAILED",
    });
  });

  it("adds JSON content type without overwriting caller headers", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ saved: true }),
    );

    await mutate("/api/example", {
      method: "POST",
      headers: { "x-request-id": "request_12345678" },
      body: JSON.stringify({ name: "Ryan" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/example",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "request_12345678",
        },
      }),
    );
  });

  it("lets the runtime set a multipart boundary for FormData", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ saved: true }),
    );
    const body = new FormData();
    body.set("name", "Ryan");

    await mutate("/api/example", { method: "POST", body });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/example",
      expect.objectContaining({ body, headers: undefined }),
    );
  });
});
