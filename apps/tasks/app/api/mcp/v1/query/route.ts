import { NextResponse } from "next/server";
import { databaseFailure } from "@/lib/server/api-response";
import { authorizeMcpRead } from "@/lib/server/mcp/read-auth";
import { executeMcpRead } from "@/lib/server/mcp/read-query";
import { readMcpRequest } from "@/lib/server/mcp/read-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = authorizeMcpRead(request);
  if ("response" in authorization) return authorization.response;
  const parsed = await readMcpRequest(request);
  if ("response" in parsed) return parsed.response;

  try {
    const result = await executeMcpRead(
      authorization.admin,
      parsed.data.action,
      parsed.data.params,
    );
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const failure = error as { code?: string; message?: string };
    return databaseFailure(request, `mcp.${parsed.data.action}`, failure, {
      error: "The requested workspace data could not be read.",
    });
  }
}
