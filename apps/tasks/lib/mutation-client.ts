"use client";

type ApiErrorBody = { error?: string };

export async function mutate<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init.body instanceof FormData
      ? init.headers
      : { "Content-Type": "application/json", ...init.headers },
  });
  const result = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) throw new Error(result.error ?? "The operation could not be completed.");
  return result;
}
