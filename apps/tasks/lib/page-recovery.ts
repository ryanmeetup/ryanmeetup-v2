/**
 * A render can fail for something that is already over by the time anyone
 * reads about it: a token minted a moment ahead of the database's clock, a
 * connection dropped mid-request. Reloading fixes those, which is why the
 * honest answer to the crash page has always been to press the button on it.
 *
 * So the page presses it. What this budget decides is when to stop: a failure
 * that comes straight back is shown rather than reloaded again, because at
 * that point it is not a blip and reloading forever would only hide it. A
 * failure that happens again long after the last one starts with a full
 * budget, since it is a new problem rather than the same one.
 */

/** How long a spent attempt counts against the budget. */
export const RECOVERY_WINDOW_MS = 30_000;
/** Reloads inside that window before the failure is shown rather than retried. */
export const RECOVERY_ATTEMPTS = 1;
/** Long enough for a blip to pass, short enough to read as a reload. */
export const RECOVERY_DELAY_MS = 400;

export function recoveryBudget({
  attempts = RECOVERY_ATTEMPTS,
  windowMs = RECOVERY_WINDOW_MS,
  now = () => Date.now(),
}: {
  attempts?: number;
  windowMs?: number;
  now?: () => number;
} = {}) {
  const spent: number[] = [];
  /** Whether this failure may retry itself. Spends an attempt when it may. */
  return function claimRecovery() {
    const at = now();
    while (spent.length > 0 && at - spent[0] > windowMs) spent.shift();
    if (spent.length >= attempts) return false;
    spent.push(at);
    return true;
  };
}

/**
 * The same decision for the same failure, however many times it is rendered.
 * A boundary re-rendering the failure it is already reloading must not spend
 * another attempt, and the failure object itself is what tells them apart.
 */
export function reloadPolicy(claimRecovery = recoveryBudget()) {
  const decided = new WeakMap<object, boolean>();
  return function mayReload(failure: object) {
    const known = decided.get(failure);
    if (known !== undefined) return known;
    const may = claimRecovery();
    decided.set(failure, may);
    return may;
  };
}
