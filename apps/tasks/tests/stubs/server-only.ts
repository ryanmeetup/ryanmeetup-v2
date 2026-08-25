// `server-only` is resolved by the Next.js compiler, not installed as a
// package. Route tests import server modules directly, so vitest aliases the
// guard to this no-op.
export {};
