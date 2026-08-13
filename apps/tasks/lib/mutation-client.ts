"use client";

type ApiErrorBody = { code?: string; error?: string; requestId?: string };

export class ApiMutationError extends Error {
  constructor(
    message: string,
    readonly code = "OPERATION_FAILED",
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiMutationError";
  }
}

export async function parseMutationResponse<T>(response: Response): Promise<T> {
  const result = (await response.json()) as T & ApiErrorBody;
  if (!response.ok)
    throw new ApiMutationError(
      result.error ?? "The operation could not be completed. Try again.",
      result.code,
      result.requestId ?? response.headers.get("x-request-id") ?? undefined,
    );
  return result;
}

export async function mutate<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers:
      init.body instanceof FormData
        ? init.headers
        : { "Content-Type": "application/json", ...init.headers },
  });
  return parseMutationResponse<T>(response);
}
