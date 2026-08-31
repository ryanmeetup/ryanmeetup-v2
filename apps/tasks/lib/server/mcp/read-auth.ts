import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { apiError } from "@/lib/server/api-response";
import { getAdminClient } from "@/lib/server/admin-client";
import type { NextResponse } from "next/server";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
type McpReadAuthorization =
  | { response: NextResponse }
  | { admin: NonNullable<ReturnType<typeof getAdminClient>> };

function tokenHash(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isMcpReadConfigured() {
  return (
    process.env.TASKS_MCP_READ_ENABLED === "true" &&
    TOKEN_PATTERN.test(process.env.TASKS_MCP_READ_TOKEN_SHA256 ?? "")
  );
}

export function authorizeMcpRead(request: Request): McpReadAuthorization {
  if (!isMcpReadConfigured()) {
    return {
      response: apiError(
        503,
        "SERVICE_UNAVAILABLE",
        "The MCP read service is not configured for this workspace.",
      ),
    } as const;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  const configured = Buffer.from(
    process.env.TASKS_MCP_READ_TOKEN_SHA256!,
    "hex",
  );
  const supplied = match ? tokenHash(match[1]) : Buffer.alloc(32);
  if (!timingSafeEqual(configured, supplied)) {
    return {
      response: apiError(
        401,
        "AUTH_REQUIRED",
        "A valid MCP read token is required.",
        { "WWW-Authenticate": 'Bearer realm="Ryan Meetup Tasks MCP"' },
      ),
    } as const;
  }

  const admin = getAdminClient();
  if (!admin) {
    return {
      response: apiError(
        503,
        "SERVICE_UNAVAILABLE",
        "The MCP read service cannot reach its workspace.",
      ),
    } as const;
  }
  return { admin } as const;
}
