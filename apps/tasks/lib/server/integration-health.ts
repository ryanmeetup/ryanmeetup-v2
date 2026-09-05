import "server-only";

import { getAdminClient } from "@/lib/server/admin-client";
import { readBeginnerFlowHealth } from "@/lib/server/beginner-flow-health";
import { instanceBuild } from "@/lib/instance";

export type IntegrationState =
  "connected" | "configured" | "disabled" | "attention" | "missing";

/** Which glyph a fact carries. Mapped to an icon in the client component. */
export type FactKind =
  "host" | "secret" | "client" | "email" | "schedule" | "accounts" | "origin";

/**
 * One labelled line inside an integration: what the setting is, what it
 * currently holds, and where it comes from.
 */
export type IntegrationFact = {
  kind: FactKind;
  /** What this line is, in plain words: "API key", "Sends as", "Schedule". */
  label: string;
  /** Masked or non-secret value. Null when the underlying setting is absent. */
  value: string | null;
  /** Where the value comes from: an env var name, or a config file. */
  source: string;
  /** Machine data, rendered monospace. False for prose like "1 account". */
  mono?: boolean;
};

export type IntegrationCheck = {
  key: string;
  label: string;
  state: IntegrationState;
  /** One line on what the integration does, for anyone who has not met it. */
  blurb: string;
  /** What breaks while the check is failing. Only set when it is. */
  consequence: string | null;
  facts: IntegrationFact[];
  action?: { endpoint: string; label: string };
};

/**
 * Last four characters only. Enough to tell two keys apart when rotating,
 * never enough to use one. Full secret values are never sent to the browser.
 */
function fingerprint(value: string) {
  return value.length <= 4 ? "••••" : `••••${value.slice(-4)}`;
}

const present = (name: string) => {
  const value = process.env[name]?.trim();
  return value ? value : null;
};

function hostOf(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/**
 * Read-only view of the deployment's credentials and integrations.
 *
 * Secrets are reported as present or absent with a masked fingerprint. They are
 * deliberately not editable here: they live in the hosting environment, a
 * change requires a redeploy either way, and storing them in the database to
 * render into a form would turn one compromised owner session into full
 * credential disclosure.
 */
export async function getIntegrationHealth(): Promise<IntegrationCheck[]> {
  const admin = getAdminClient();
  const beginnerFlowHealth = admin ? await readBeginnerFlowHealth(admin) : null;
  const supabaseUrl = present("NEXT_PUBLIC_SUPABASE_URL");
  const resendKey = present("RESEND_API_KEY");
  const googleId = present("GOOGLE_CALENDAR_CLIENT_ID");
  const googleSecret = present("GOOGLE_CALENDAR_CLIENT_SECRET");
  const googleTokenKey = present("GOOGLE_CALENDAR_TOKEN_KEY");
  const cronSecret = present("CRON_SECRET");
  const supabaseKey = present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const supabaseSecret = present("SUPABASE_SECRET_KEY");
  const mcpEnabled = present("TASKS_MCP_READ_ENABLED") === "true";
  const mcpTokenHash = present("TASKS_MCP_READ_TOKEN_SHA256");
  const mcpConfigured =
    mcpEnabled && Boolean(mcpTokenHash && /^[a-f0-9]{64}$/i.test(mcpTokenHash));
  const appUrl = present("TASKS_APP_URL");
  // Any of three names may supply the from-address; report the one in use so
  // the row points at the variable an operator would actually edit.
  const fromEmailVar =
    [
      "TASK_DIGEST_FROM_EMAIL",
      "TASK_REMINDER_FROM_EMAIL",
      "RESEND_FROM_EMAIL",
    ].find((name) => present(name)) ?? "TASK_DIGEST_FROM_EMAIL";
  const fromEmail = present(fromEmailVar);

  let googleConnections: number | null = null;
  if (googleId && googleSecret && googleTokenKey) {
    if (admin) {
      const { count, error } = await admin
        .from("workspace_google_calendar_integrations")
        .select("id", { count: "exact", head: true });
      googleConnections = error ? null : (count ?? 0);
    }
  }

  return [
    {
      key: "workspace-foundation",
      label: "Workspace foundation",
      state: beginnerFlowHealth?.healthy ? "connected" : "attention",
      blurb:
        "Creates each member's profile, baseline access, and starter statuses.",
      consequence: beginnerFlowHealth?.healthy
        ? null
        : beginnerFlowHealth
          ? "One or more members or required database objects need repair."
          : "Provisioning health could not be read from the database.",
      facts: [
        {
          kind: "accounts",
          label: "Profiles",
          value: beginnerFlowHealth
            ? String(beginnerFlowHealth.profileCount)
            : null,
          source: "profiles",
        },
        {
          kind: "accounts",
          label: "Missing profiles",
          value: beginnerFlowHealth
            ? String(beginnerFlowHealth.authUsersWithoutProfile)
            : null,
          source: "auth.users",
        },
        {
          kind: "accounts",
          label: "Missing access",
          value: beginnerFlowHealth
            ? String(beginnerFlowHealth.profilesWithoutTier)
            : null,
          source: "access_group_members",
        },
        {
          kind: "schedule",
          label: "Starter statuses",
          value: beginnerFlowHealth
            ? String(beginnerFlowHealth.statusCount)
            : null,
          source: "statuses",
        },
        {
          kind: "secret",
          label: "Schema contract",
          value: beginnerFlowHealth
            ? beginnerFlowHealth.contractOk
              ? "Current"
              : "Incomplete"
            : null,
          source: "beginner_flow_health()",
          mono: false,
        },
      ],
      action: beginnerFlowHealth?.healthy
        ? undefined
        : {
            endpoint: "/api/admin/workspace-health",
            label: "Repair workspace foundation",
          },
    },
    {
      key: "supabase",
      label: "Supabase",
      state: supabaseUrl && supabaseKey ? "connected" : "missing",
      blurb: "The Postgres database and the auth session behind every page.",
      consequence:
        supabaseUrl && supabaseKey
          ? null
          : "Running in demo mode with local fixture data.",
      facts: [
        {
          kind: "host",
          label: "Project",
          value: supabaseUrl ? (hostOf(supabaseUrl) ?? supabaseUrl) : null,
          source: "NEXT_PUBLIC_SUPABASE_URL",
        },
        {
          kind: "client",
          label: "Browser key",
          value: supabaseKey ? fingerprint(supabaseKey) : null,
          source: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        },
      ],
    },
    {
      key: "supabase-secret",
      label: "Supabase service role",
      state: supabaseSecret ? "configured" : "missing",
      blurb:
        "Signs privileged server-side writes that bypass row-level security.",
      consequence: supabaseSecret
        ? null
        : "Privileged writes are unavailable without it.",
      facts: [
        {
          kind: "secret",
          label: "Service key",
          value: supabaseSecret ? fingerprint(supabaseSecret) : null,
          source: "SUPABASE_SECRET_KEY",
        },
      ],
    },
    {
      key: "mcp-read",
      label: "External MCP read access",
      state: mcpConfigured
        ? "configured"
        : mcpEnabled
          ? "attention"
          : "disabled",
      blurb:
        "A privileged external reader for automation. It can query all workspace data and does not inherit a person's group or page restrictions.",
      consequence:
        mcpEnabled && !mcpConfigured
          ? "External read access is enabled, but its token hash is missing or invalid."
          : null,
      facts: [
        {
          kind: "client",
          label: "External reader",
          value: mcpEnabled ? "Enabled" : "Disabled",
          source: "TASKS_MCP_READ_ENABLED",
          mono: false,
        },
        {
          kind: "secret",
          label: "Bearer token hash",
          value: mcpTokenHash ? fingerprint(mcpTokenHash) : null,
          source: "TASKS_MCP_READ_TOKEN_SHA256",
        },
      ],
    },
    {
      key: "resend",
      label: "Resend",
      state: resendKey && fromEmail ? "configured" : "missing",
      blurb: "Delivers task digests, reminders, and invitations.",
      consequence:
        resendKey && fromEmail
          ? null
          : "Task digests and reminders will not send.",
      facts: [
        {
          kind: "secret",
          label: "API key",
          value: resendKey ? fingerprint(resendKey) : null,
          source: "RESEND_API_KEY",
        },
        {
          kind: "email",
          label: "Sends as",
          value: fromEmail,
          source: fromEmailVar,
        },
      ],
    },
    {
      key: "google-calendar",
      label: "Google Calendar",
      state:
        googleId && googleSecret && googleTokenKey
          ? googleConnections
            ? "connected"
            : "configured"
          : "missing",
      blurb: "Syncs tasks with the calendars workspace members link.",
      consequence:
        googleId && googleSecret && googleTokenKey
          ? null
          : "Calendar sync is unavailable.",
      facts: [
        {
          kind: "client",
          label: "OAuth client",
          value: googleId ? fingerprint(googleId) : null,
          source: "GOOGLE_CALENDAR_CLIENT_ID",
        },
        {
          kind: "secret",
          label: "OAuth secret",
          value: googleSecret ? fingerprint(googleSecret) : null,
          source: "GOOGLE_CALENDAR_CLIENT_SECRET",
        },
        {
          kind: "secret",
          label: "Token encryption",
          value: googleTokenKey ? fingerprint(googleTokenKey) : null,
          source: "GOOGLE_CALENDAR_TOKEN_KEY",
        },
        {
          kind: "accounts",
          label: "Linked",
          value:
            googleConnections === null
              ? "Count unavailable"
              : `${googleConnections} account${googleConnections === 1 ? "" : "s"}`,
          source: "workspace_google_calendar_integrations",
          mono: false,
        },
      ],
    },
    {
      key: "cron",
      label: "Scheduled jobs",
      state: cronSecret ? "configured" : "missing",
      blurb: "The shared secret every cron route checks before it runs.",
      consequence: cronSecret ? null : "Cron routes will reject every request.",
      facts: [
        {
          kind: "secret",
          label: "Shared secret",
          value: cronSecret ? fingerprint(cronSecret) : null,
          source: "CRON_SECRET",
        },
        {
          kind: "schedule",
          label: "Task digests",
          value: "Weekdays, 13:00 UTC",
          source: "vercel.json",
          mono: false,
        },
        {
          kind: "schedule",
          label: "Attachment sweep",
          value: "Daily, 03:17 UTC",
          source: "vercel.json",
          mono: false,
        },
      ],
    },
    {
      key: "app-url",
      label: "Canonical origin",
      state: appUrl ? "configured" : "missing",
      blurb: "The base URL every link in an outgoing email is built from.",
      consequence: appUrl
        ? null
        : "Email links fall back to the request origin.",
      facts: [
        {
          kind: "origin",
          label: "Origin",
          value: appUrl,
          source: "TASKS_APP_URL",
        },
      ],
    },
  ];
}

/** Build-time identity, shown read-only beside the editable branding. */
export function buildTimeIdentity() {
  return [
    {
      label: "Task key prefix",
      value: `${instanceBuild.taskKeyPrefix}-142`,
      variable: "NEXT_PUBLIC_TASK_KEY_PREFIX",
      note: "Appears in every task URL. Changing it breaks existing links.",
    },
    {
      label: "Changelog version",
      value: `${instanceBuild.changelogVersionPrefix} v5`,
      variable: "NEXT_PUBLIC_CHANGELOG_VERSION_PREFIX",
      note: "Defaults to the task key prefix.",
    },
  ];
}
