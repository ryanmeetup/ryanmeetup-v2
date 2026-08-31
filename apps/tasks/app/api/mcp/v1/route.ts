import { NextResponse } from "next/server";
import { authorizeMcpRead } from "@/lib/server/mcp/read-auth";

export const runtime = "nodejs";

export function GET(request: Request) {
  const authorization = authorizeMcpRead(request);
  if ("response" in authorization) return authorization.response;
  return NextResponse.json(
    {
      name: "Ryan Meetup Tasks read API",
      version: 1,
      readOnly: true,
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
