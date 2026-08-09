import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient }));

const statusId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";
const reporterId = "33333333-3333-4333-8333-333333333333";
const validBody = {
  task: {
    title: "  Ship it  ",
    status_id: statusId,
    reported_by: reporterId,
    priority: "high",
  },
  categoryIds: [categoryId, categoryId],
};

const request = () =>
  new Request("http://localhost/api/tasks", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(validBody),
  });

describe("POST /api/tasks", () => {
  beforeEach(() => {
    createClient.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
    process.env.TASKS_APP_URL = "http://localhost";
  });

  it("rejects an anonymous request before attempting a mutation", async () => {
    const rpc = vi.fn();
    createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      rpc,
    });
    const { POST } = await import("@/app/api/tasks/route");
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("uses the transactional RPC and normalizes user input", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: { task: { id: "task-1" } }, error: null });
    createClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      rpc,
    });
    const { POST } = await import("@/app/api/tasks/route");
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith(
      "save_task",
      expect.objectContaining({
        task_values: expect.objectContaining({
          title: "Ship it",
          reported_by: reporterId,
        }),
        category_ids: [categoryId],
      }),
    );
  });

  it("surfaces a failed atomic mutation without reporting success", async () => {
    const errorLog = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    createClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "permission denied" },
      }),
    });
    const { POST } = await import("@/app/api/tasks/route");
    const response = await POST(request());
    expect(response.status).toBe(500);
    const result = await response.json();
    expect(result).toMatchObject({
      code: "OPERATION_FAILED",
      error: "The task could not be saved. Try again.",
    });
    expect(result.requestId).toBe(response.headers.get("x-request-id"));
    expect(result.error).not.toContain("permission denied");
    expect(errorLog).toHaveBeenCalledWith(
      "Database operation failed",
      expect.objectContaining({
        requestId: result.requestId,
        operation: "task.save",
        message: "permission denied",
      }),
    );
    errorLog.mockRestore();
  });
});
