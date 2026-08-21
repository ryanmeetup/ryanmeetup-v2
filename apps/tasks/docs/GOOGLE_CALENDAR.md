# Google Calendar integration

The Tasks calendar can show events from one Google Calendar connected by a
workspace owner. Google events appear automatically for owners and members of
access groups with **View the workspace Google Calendar** enabled. Imported
event details are fetched from Google and are not copied into the workspace
database.

This is intentionally one-way by default: Tasks, important dates, and time-away
entries created in this app are never sent to Google automatically. The OAuth
grant permits writing events owned by the connected account so a future,
explicit “Publish to Google” action can be added without asking the owner to
reconnect.

## Google Cloud setup

1. Create or select a Google Cloud project and enable the Google Calendar API.
2. Configure the OAuth consent screen. Add the scopes `openid`, `email`, and
   `https://www.googleapis.com/auth/calendar.events.owned`.
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
   - `GOOGLE_CALENDAR_ID` — optional. Omit it to sync the connected account's
     primary calendar. For a separate calendar, use its calendar ID from Google
     Calendar's **Settings and sharing → Integrate calendar** section.

Keep the token key stable. Changing it invalidates existing connections, which
must then be disconnected and authorized again.

Google refresh tokens are encrypted with AES-256-GCM before being stored in the
locked workspace integration table. Access tokens are short-lived and are
never persisted. Disconnecting revokes the Google grant and removes the saved
connection.

## Connect and grant access

1. Deploy the environment variables and sign in to Tasks as an app owner.
2. Open **Calendar** and choose **Connect workspace calendar**. Sign in with the
   Google account that owns the calendar and approve the requested access.
3. Open **Access**, create or edit an access group, and enable **View the
   workspace Google Calendar** for each group that should see Google events.

Owners can always view and manage the connection. Other users see neither the
Google events nor the connection card unless their effective access-group
permissions include calendar access.
