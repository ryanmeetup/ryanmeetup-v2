# Google Calendar integration

The Tasks calendar can show events from one Google Calendar connected by a
workspace owner. Google events appear automatically for owners and members of
access groups with **View the workspace Google Calendar** enabled. Imported
event details are fetched from Google and are not copied into the workspace
database. A timed event shows the hours it runs and the zone they are in, such
as `9:00 AM – 10:30 AM EDT`; one that runs past midnight shows only when it
starts. Every imported event comes from the same connected calendar, so tiles
do not repeat which calendar that is.

Every time on the calendar is read and written in one zone, `WORKSPACE_TIME_ZONE`
in `lib/calendar/google-calendar-sync.ts`. Imported events are requested from
Google in that zone rather than the connected calendar's own, so the hours on a
tile are the hours the label claims. The zone is resolved per date, so a repeat
that crosses a daylight-saving change is labelled correctly on both sides of it.
There is no per-Ryan zone: a Ryan reading from another city sees Eastern hours,
named as such.

Sync is one-way by default: tasks, important dates, and time-away entries
created in this app are never sent to Google automatically.

## Reading an imported event

Clicking an imported tile opens a read-only details dialog rather than leaving
for Google, so the invite can be read in place: the full day and hours, the
description, where it is, the guest list with each reply, any attachments, and
buttons to join the meeting. **Open in Google Calendar** is in the dialog for
anyone who needs to reply to the invite or change it, which this app cannot do.

The details arrive with the month load, so each one is bounded rather than
passed through whole:

- Descriptions are stored by Google as HTML written by whoever created the
  event. They are flattened to text on the server, never rendered as markup, and
  cut past 2000 characters with the dialog saying it shortened them.
- Guest lists are capped at 50 names; the dialog still reports the real head
  count and points at Google for the rest.
- Ways to join come from Google's own conference data, plus the meeting link on
  the event and, when neither offered a room, a known provider's link pasted
  into the location. Only `http`, `https`, and dial-in `tel:` addresses are
  kept.

Everyone who can see the shared calendar sees these details, including guest
email addresses. A calendar with events that should not be read that widely
should not be the one connected here.

## Publishing a workspace date to Google

An important date or time-away entry can be copied to the connected calendar
with **Add to the workspace Google Calendar** in the calendar dialog. The option
appears only when a workspace calendar is connected and the author can already
see it, and it is off unless it is turned on.

The workspace row owns the copy, so the calendar shows a published date once
rather than twice:

- The Google event ID is derived from the workspace event ID, which keeps the
  two calendars reconcilable without storing a second identifier.
- Saving an edit republishes the copy; clearing the option or deleting the date
  removes it from Google.
- The workspace row is saved first. When Google cannot be reached, the save
  still succeeds and the dialog reports that Google was not updated.

A repeating date is published as one Google event carrying an `RRULE` rather
than a copy per date, and the instances Google returns for it are recognized by
the series they name. See `docs/CALENDAR_RECURRENCE.md`.

A published copy follows Google's sharing, not workspace scoping. A date scoped
to one project or category is still visible in Google to everyone who can see
the connected calendar.

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
