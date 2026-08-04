import { tasksAppOrigin } from "@/lib/app-url";
import { apiError } from "./api-response";
import type { NextResponse } from "next/server";

const MAX_JSON_BYTES = 16 * 1024;

export type ApiSchema<T> = (value: unknown) => T | null;

type ParsedJson<T> =
  | { data: T }
  | { response: NextResponse };

export async function readJson<T>(
  request: Request,
  schema: ApiSchema<T>,
): Promise<ParsedJson<T>> {
  let allowedOrigin: string | null = null;
  try {
    allowedOrigin = tasksAppOrigin(request);
  } catch {
    // Invalid application URL configuration is handled as a rejected origin.
  }
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigin || origin !== allowedOrigin) {
    return {
      response: apiError(
        403,
        "ORIGIN_REJECTED",
        "This request did not come from the Tasks app.",
      ),
    } as const;
  }
  if (
    request.headers.get("content-type")?.split(";", 1)[0] !== "application/json"
  ) {
    return {
      response: apiError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Send this request as JSON.",
      ),
    } as const;
  }
  const declaredSize = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_JSON_BYTES) {
    return {
      response: apiError(413, "REQUEST_TOO_LARGE", "The request is too large."),
    } as const;
  }
  let text: string;
  try {
    text = await request.text();
  } catch {
    return {
      response: apiError(
        400,
        "INVALID_JSON",
        "The request body is not valid JSON.",
      ),
    } as const;
  }
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
    return {
      response: apiError(413, "REQUEST_TOO_LARGE", "The request is too large."),
    } as const;
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return {
      response: apiError(
        400,
        "INVALID_JSON",
        "The request body is not valid JSON.",
      ),
    } as const;
  }
  const data = schema(value);
  return data
    ? ({ data } as const)
    : ({
        response: apiError(
          400,
          "INVALID_REQUEST",
          "The request fields are not valid.",
        ),
      } as const);
}
