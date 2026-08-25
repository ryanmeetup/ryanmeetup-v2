import "server-only";

/**
 * Whether a Supabase error means the table itself does not exist, as opposed to
 * a query, permission, or connectivity failure.
 *
 * `42P01` is Postgres `undefined_table`; `PGRST205` is PostgREST reporting a
 * table absent from its schema cache. Callers use this to tolerate a table that
 * a pending migration has not created yet — never to swallow other failures.
 */
export const isMissingRelation = (code?: string) =>
  code === "42P01" || code === "PGRST205";

/** Told to whoever reads the log: how to make the missing table appear. */
export const APPLY_MIGRATIONS_HINT =
  "Apply the pending migrations in apps/tasks/supabase/migrations with `supabase db push`.";
