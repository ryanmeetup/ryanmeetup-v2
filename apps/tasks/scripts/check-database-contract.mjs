import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

if (process.env.SKIP_DATABASE_CONTRACT_CHECK === "1") {
  console.log("Database contract preflight skipped explicitly.");
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secret = process.env.SUPABASE_SECRET_KEY?.trim();

if (!url || !secret) {
  console.log(
    "Database contract preflight skipped: deployment credentials are not present.",
  );
  process.exit(0);
}

const projectRef = new URL(url).hostname.split(".")[0];

let response;
try {
  response = await fetch(`${url}/rest/v1/rpc/beginner_flow_health`, {
    method: "POST",
    headers: {
      apikey: secret,
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: "{}",
    signal: AbortSignal.timeout(15_000),
  });
} catch (error) {
  console.error(
    "Database contract preflight could not reach the configured Supabase project.",
    error instanceof Error ? error.message : "Unknown network error",
  );
  process.exit(1);
}

if (!response.ok) {
  console.error(
    `Database contract preflight failed for ${projectRef} (${response.status}). Apply and verify the linked database changes before deploying the app.`,
  );
  process.exit(1);
}

const health = await response.json();
if (!health?.contractOk) {
  console.error(
    "Database contract preflight failed: required columns, functions, or triggers are missing.",
  );
  process.exit(1);
}

console.log(`Database contract preflight passed for ${projectRef}.`);
