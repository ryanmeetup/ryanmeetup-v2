# Google Calendar integration

The Tasks calendar can show events from each signed-in Ryan's primary Google
Calendar. Access is read-only and per-user: imported event details are fetched
for the current request and are never written to the workspace database or
shown to another teammate.

## Google Cloud setup

1. Create or select a Google Cloud project and enable the Google Calendar API.
2. Configure the OAuth consent screen. Add the scopes `openid`, `email`, and
   `https://www.googleapis.com/auth/calendar.events.readonly`.
3. Create an OAuth client with application type **Web application**.
4. Add the production redirect URI:
   `https://tasks.ryanmeetup.com/api/integrations/google-calendar/callback`.
   Add the equivalent localhost or preview URI only in the corresponding
   environment's OAuth client.
5. Configure these server-only environment variables for the Tasks deployment:

   - `GOOGLE_CALENDAR_CLIENT_ID`
   - `GOOGLE_CALENDAR_CLIENT_SECRET`
   - `GOOGLE_CALENDAR_TOKEN_KEY` — a base64-encoded 32-byte key, generated with
     `openssl rand -base64 32`

Keep the token key stable. Changing it invalidates existing connections, which
must then be disconnected and authorized again.

Google refresh tokens are encrypted with AES-256-GCM before being stored in the
user's Supabase auth app metadata. Access tokens are short-lived and are never
persisted. Disconnecting revokes the Google grant and removes the saved
connection metadata.
