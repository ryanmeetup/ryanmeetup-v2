#!/usr/bin/env node
/**
 * Builds the paste-ready SQL for an instance this machine cannot reach.
 *
 * PRD gets its schema by hand — see docs/DATABASE.md — and handing over one
 * migration at a time is how an instance ends up half-applied. This writes
 * every migration after a given version into a single transaction, in order,
 * ending with the rows that record them in `supabase_migrations`, so the next
 * reading of that table is right.
 *
 * The block refuses to run anywhere it does not belong: it checks that every
 * migration up to the one it continues from is applied and that none of its
 * own are, and a failed check rolls the whole transaction back rather than
 * leaving a database half a schema ahead. Naming what is missing is the point
 * — an instance can be behind in the middle as easily as at the end, and the
 * five most recent versions do not show it.
 *
 *   node scripts/build-catchup-sql.mjs 20260912000000 [out.sql]
 *
 * Ask the instance what it holds rather than assuming; the query is in
 * docs/DATABASE.md under "Outstanding".
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = new URL("../supabase/migrations/", import.meta.url)
  .pathname;
const [after, out = "catchup.sql"] = process.argv.slice(2);

if (!/^\d{14}$/.test(after ?? "")) {
  console.error(
    "Usage: node scripts/build-catchup-sql.mjs <version the instance is on> [out.sql]",
  );
  process.exit(1);
}

const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();
const expected = migrations
  .map((file) => file.slice(0, 14))
  .filter((version) => version <= after);
const pending = migrations
  .filter((file) => file.slice(0, 14) > after)
  .map((file) => ({
    file,
    version: file.slice(0, 14),
    name: file.slice(15, -4),
    body: readFileSync(join(migrationsDir, file), "utf8").replace(/\n+$/, ""),
  }));

if (pending.length === 0) {
  console.error(`Nothing is newer than ${after}.`);
  process.exit(1);
}

const rule = `-- ${"-".repeat(73)}`;
const first = pending[0].version;
const last = pending.at(-1).version;

const sql = `-- Catch-up: ${first} through ${last}
--
-- Run this whole file in the SQL Editor of the instance that is behind. It is
-- one transaction: either all ${pending.length} migrations apply or none of them do.
--
-- Copied verbatim from apps/tasks/supabase/migrations, in order, and ending
-- with the rows that record them in supabase_migrations.schema_migrations so
-- the next reading of that table is right.

begin;

-- Refuses to run against a database that is not where this block expects it,
-- rather than applying half a schema to it.
do $catchup_guard$
declare
  missing text;
  already text;
begin
  select string_agg(expected, ', ' order by expected) into missing
  from unnest(array[
${expected.map((version) => `    '${version}'`).join(",\n")}
  ]) as expected
  where not exists (
    select 1 from supabase_migrations.schema_migrations applied
    where applied.version = expected
  );
  if missing is not null then
    raise exception
      'This block continues from ${after}, but these are not applied here: %. Send those back and ask for a block that starts where this database actually is.', missing;
  end if;

  select string_agg(version, ', ' order by version) into already
  from supabase_migrations.schema_migrations
  where version in (
${pending.map(({ version }) => `      '${version}'`).join(",\n")}
  );
  if already is not null then
    raise exception
      'Already applied here: %. Ask for a block that starts after them.', already;
  end if;
end
$catchup_guard$;
${pending
  .map(
    ({ version, name, body }) => `
${rule}
-- ${version}  ${name}
${rule}

${body}
`,
  )
  .join("")}
${rule}
-- Record what this block applied.
${rule}

insert into supabase_migrations.schema_migrations (version, name)
values
${pending.map(({ version, name }) => `  ('${version}', '${name}')`).join(",\n")};

commit;
`;

writeFileSync(out, sql);
console.log(
  `${out}: ${pending.length} migrations, ${first} through ${last}, ${sql.split("\n").length} lines`,
);
