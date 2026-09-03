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
  assigneeIds: [reporterId],
  categoryIds: [categoryId, categoryId],
};

/**
 * A query builder for the read-back the save makes for its audit row and any
 * status-reason comment. Every chained filter returns itself, so the stub does
 * not have to know which ones the route uses.
 */
const queryStub = () => {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "limit"])
    builder[method] = () => builder;
  builder.maybeSingle = async () => ({ data: null, error: null });
  return builder;
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
      from: queryStub,
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
        assignee_ids: [reporterId],
      }),
    );
  });

  it("returns the status's own reason requirement to the caller", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "TK001",
          message: "Add a reason before moving this task to Will Not Do.",
        },
      }),
    });
    const { POST } = await import("@/app/api/tasks/route");
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "OPERATION_FAILED",
      error: "Add a reason before moving this task to Will Not Do.",
    });
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

describe("GET /api/tasks", () => {
  beforeEach(() => {
    createClient.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
    process.env.TASKS_APP_URL = "http://localhost";
  });

  it("fails instead of replacing assignees with an empty relation", async () => {
    const taskQuery: Record<string, unknown> = {};
    for (const method of ["select", "or", "order"])
      taskQuery[method] = () => taskQuery;
    taskQuery.then = (
      resolve: (value: unknown) => void,
      reject: (reason: unknown) => void,
    ) =>
      Promise.resolve({
        data: [{ id: "task-1" }],
        error: null,
        count: null,
      }).then(resolve, reject);

    const relation = (error: { message: string } | null) => ({
      select: () => ({
        in: async () => ({ data: error ? null : [], error }),
      }),
    });
    createClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: (table: string) =>
        table === "tasks"
          ? taskQuery
          : relation(
              table === "task_assignees"
                ? { message: "assignment read failed" }
                : null,
            ),
    });
    const errorLog = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { GET } = await import("@/app/api/tasks/route");
    const response = await GET(
      new Request("http://localhost/api/tasks", {
        headers: { origin: "http://localhost" },
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      code: "OPERATION_FAILED",
      error: "Task details could not be loaded. Try again.",
    });
    errorLog.mockRestore();
  });
});
