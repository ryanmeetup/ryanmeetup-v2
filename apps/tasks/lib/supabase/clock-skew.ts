/**
 * PostgREST checks the access token's `iat` against the database's own clock
 * and refuses a token minted a moment ahead of it: `401 JWT issued at future`.
 * Nothing about the session is wrong — the same token is accepted seconds
 * later — but the refusal arrives as a failed query, and a failed query on a
 * server render is a crash page for whoever asked for it. PRD served its whole
 * workspace that way on 2026-09-05, from a single request that happened to
 * land inside the skew.
 *
 * A refused request never reached the database, so replaying it is safe for
 * reads and writes alike. Wait the skew out and send it again; a response that
 * is still refused after the last attempt is handed back untouched, because by
 * then it is a real failure and belongs to the caller.
 */

/** How long to wait before each replay. One entry is one extra attempt. */
const RETRY_DELAYS_MS = [500, 1500];

/** What PostgREST and GoTrue call a token whose validity has not begun. */
const NOT_YET_VALID = /issued at future|not yet valid/i;

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

async function isNotYetValid(response: Response) {
  if (response.status !== 401) return false;
  try {
    return NOT_YET_VALID.test(await response.clone().text());
  } catch {
    // An unreadable body is not evidence of skew; let the caller see the 401.
    return false;
  }
}

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export function withClockSkewRetry(
  send: FetchLike = (input, init) => fetch(input, init),
  delaysMs: readonly number[] = RETRY_DELAYS_MS,
): FetchLike {
  return async (input, init) => {
    let response = await send(input, init);
    // A `Request` carries a single-use body, so only a replayable call retries.
    if (input instanceof Request) return response;
    for (const delay of delaysMs) {
      if (!(await isNotYetValid(response))) return response;
      console.warn(
        `Supabase refused a token as issued in the future; retrying in ${delay}ms.`,
      );
      await wait(delay);
      response = await send(input, init);
    }
    return response;
  };
}
