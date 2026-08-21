import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAllowedTasksRequestOrigin, tasksAppUrl } from "@/lib/app-url";
import type {
  GoogleCalendarConnection,
  GoogleCalendarEvent,
} from "@/lib/calendar/google-calendar-types";
import { getAdminClient } from "./admin-client";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_URL = "https://www.googleapis.com/calendar/v3";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events.owned",
];

export const GOOGLE_OAUTH_COOKIE = "tasks_google_calendar_oauth";
export const GOOGLE_CALENDAR_INTEGRATION_ID = "google_calendar";

export type GoogleCalendarIntegrationRow = {
  id: string;
  encrypted_refresh_token: string;
  account_email: string;
  calendar_id: string;
  connected_by: string;
  connected_at: string;
  updated_at: string;
};

type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

type GoogleEventList = {
  items?: GoogleEvent[];
  nextPageToken?: string;
  summary?: string;
};

function configuration() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const tokenKey = process.env.GOOGLE_CALENDAR_TOKEN_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim() || "primary";
  if (!clientId || !clientSecret || !tokenKey) return null;
  return { clientId, clientSecret, tokenKey, calendarId };
}

export function isGoogleCalendarConfigured() {
  const config = configuration();
  if (!config) return false;
  return Buffer.from(config.tokenKey, "base64").length === 32;
}

export function configuredGoogleCalendarId() {
  return configuration()?.calendarId ?? "primary";
}

export function googleCalendarRedirectUri(request?: Request | string) {
  if (request) {
    const requestUrl = new URL(
      typeof request === "string" ? request : request.url,
    );
    if (isAllowedTasksRequestOrigin(requestUrl.origin)) {
      return new URL(
        "/api/integrations/google-calendar/callback",
        requestUrl.origin,
      ).toString();
    }
  }
  return tasksAppUrl("/api/integrations/google-calendar/callback", request);
}

function encryptionKey(value: string) {
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 32)
    throw new Error(
      "GOOGLE_CALENDAR_TOKEN_KEY must be a base64-encoded 32-byte key.",
    );
  return decoded;
}

export function encryptGoogleRefreshToken(token: string) {
  const config = configuration();
  if (!config) throw new Error("Google Calendar is not configured.");
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    encryptionKey(config.tokenKey),
    iv,
  );
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), encrypted]
    .map((part) =>
      typeof part === "string" ? part : part.toString("base64url"),
    )
    .join(".");
}

export function decryptGoogleRefreshToken(value: string) {
  const config = configuration();
  if (!config) throw new Error("Google Calendar is not configured.");
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue)
    throw new Error("The saved Google Calendar connection is invalid.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(config.tokenKey),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function googleCalendarConnection(
  row: GoogleCalendarIntegrationRow | null,
): GoogleCalendarConnection {
  return row
    ? {
        connected: true,
        email: row.account_email,
        connectedAt: row.connected_at,
        calendarId: row.calendar_id,
      }
    : { connected: false };
}

export function googleCalendarIntegrationValues(
  refreshToken: string,
  email: string,
  connectedBy: string,
) {
  const now = new Date().toISOString();
  return {
    id: GOOGLE_CALENDAR_INTEGRATION_ID,
    encrypted_refresh_token: encryptGoogleRefreshToken(refreshToken),
    account_email: email,
    calendar_id: configuredGoogleCalendarId(),
    connected_by: connectedBy,
    connected_at: now,
    updated_at: now,
  };
}

export async function loadGoogleCalendarIntegration() {
  const admin = getAdminClient();
  if (!admin) return null;
  const result = await admin
    .from("workspace_google_calendar_integrations")
    .select("*")
    .eq("id", GOOGLE_CALENDAR_INTEGRATION_ID)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data as GoogleCalendarIntegrationRow | null;
}

export async function canViewWorkspaceGoogleCalendar(
  supabase: SupabaseClient,
) {
  const result = await supabase.rpc("can_view_workspace_calendar");
  if (result.error) throw result.error;
  return result.data === true;
}

export function createGoogleOAuthRequest(request: Request) {
  const config = configuration();
  if (!config) throw new Error("Google Calendar is not configured.");
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const url = new URL(GOOGLE_AUTH_URL);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: googleCalendarRedirectUri(request),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: GOOGLE_SCOPES.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return {
    url,
    cookieValue: Buffer.from(JSON.stringify({ state, verifier })).toString(
      "base64url",
    ),
  };
}

export function parseGoogleOAuthCookie(value: string | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as { state?: unknown; verifier?: unknown };
    return typeof parsed.state === "string" &&
      typeof parsed.verifier === "string"
      ? { state: parsed.state, verifier: parsed.verifier }
      : null;
  } catch {
    return null;
  }
}

async function googleJson<T>(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    console.error("Google Calendar request failed", {
      status: response.status,
      body: body.slice(0, 500),
    });
    throw new Error("Google Calendar could not be reached.");
  }
  return response.json() as Promise<T>;
}

export async function exchangeGoogleAuthorizationCode(
  request: Request,
  code: string,
  verifier: string,
) {
  const config = configuration();
  if (!config) throw new Error("Google Calendar is not configured.");
  return googleJson<{ access_token: string; refresh_token?: string }>(
    GOOGLE_TOKEN_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: googleCalendarRedirectUri(request),
      }),
    },
  );
}

export async function googleAccountEmail(accessToken: string) {
  const profile = await googleJson<{ email?: string }>(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profile.email) throw new Error("Google did not return an account email.");
  return profile.email;
}

async function accessToken(connection: GoogleCalendarIntegrationRow) {
  const config = configuration();
  if (!config) throw new Error("Google Calendar is not configured.");
  const result = await googleJson<{ access_token: string }>(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: decryptGoogleRefreshToken(
        connection.encrypted_refresh_token,
      ),
      grant_type: "refresh_token",
    }),
  });
  return result.access_token;
}

function addUtcDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function googleCalendarMonthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  start.setUTCDate(start.getUTCDate() - 7);
  const end = new Date(Date.UTC(year, monthNumber, 8));
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function listGoogleCalendarEvents(
  connection: GoogleCalendarIntegrationRow,
  month: string,
) {
  const range = googleCalendarMonthRange(month);
  if (!range) return [];
  const token = await accessToken(connection);
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  do {
    const calendarId = encodeURIComponent(connection.calendar_id);
    const url = new URL(
      `${GOOGLE_CALENDAR_URL}/calendars/${calendarId}/events`,
    );
    url.search = new URLSearchParams({
      timeMin: range.start,
      timeMax: range.end,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "2500",
      ...(pageToken ? { pageToken } : {}),
    }).toString();
    const page = await googleJson<GoogleEventList>(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    for (const event of page.items ?? []) {
      if (
        event.status === "cancelled" ||
        !event.id ||
        !event.start ||
        !event.end
      )
        continue;
      const allDay = Boolean(event.start.date);
      const start = event.start.date ?? event.start.dateTime?.slice(0, 10);
      const rawEnd = event.end.date ?? event.end.dateTime?.slice(0, 10);
      if (!start || !rawEnd) continue;
      events.push({
        id: event.id,
        title: event.summary?.trim() || "Busy",
        start,
        end: allDay ? addUtcDays(rawEnd, -1) : rawEnd,
        allDay,
        htmlLink: event.htmlLink,
        calendarName: page.summary ?? "Google Calendar",
      });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return events;
}

export async function revokeGoogleCalendar(
  connection: GoogleCalendarIntegrationRow,
) {
  if (!configuration()) return;
  try {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: decryptGoogleRefreshToken(
          connection.encrypted_refresh_token,
        ),
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Google Calendar token revocation failed", error);
  }
}
