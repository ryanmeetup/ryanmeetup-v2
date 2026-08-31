import { describe, expect, it } from "vitest";
import { readMcpRequest } from "@/lib/server/mcp/read-request";

const request = (body: string, contentType = "application/json") =>
  new Request("http://localhost/api/mcp/v1/query", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
  });

describe("MCP read request parsing", () => {
  it("accepts a known action and plain parameter object", async () => {
    const result = await readMcpRequest(
      request(JSON.stringify({ action: "list_tasks", params: { limit: 25 } })),
    );
    expect(result).toEqual({
      data: { action: "list_tasks", params: { limit: 25 } },
    });
  });

  it("rejects unknown actions, arrays for params, and non-JSON content", async () => {
    const unknown = await readMcpRequest(
      request(JSON.stringify({ action: "delete_everything" })),
    );
    const array = await readMcpRequest(
      request(JSON.stringify({ action: "list_tasks", params: [] })),
    );
    const text = await readMcpRequest(request("hello", "text/plain"));
    expect("response" in unknown && unknown.response.status).toBe(400);
    expect("response" in array && array.response.status).toBe(400);
    expect("response" in text && text.response.status).toBe(415);
  });

  it("caps the request body before parsing it", async () => {
    const result = await readMcpRequest(
      request(JSON.stringify({ action: "list_tasks", padding: "x".repeat(33_000) })),
    );
    expect("response" in result && result.response.status).toBe(413);
  });
});
