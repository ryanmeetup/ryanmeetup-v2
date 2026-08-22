export type GoogleCalendarConnection = {
  connected: boolean;
  email?: string;
  connectedAt?: string;
  calendarId?: string;
};

export type GoogleCalendarResponse =
  | "accepted"
  | "declined"
  | "tentative"
  | "needsAction";

export type GoogleCalendarPerson = {
  email?: string;
  name?: string;
};

export type GoogleCalendarAttendee = GoogleCalendarPerson & {
  response: GoogleCalendarResponse;
  optional?: boolean;
  organizer?: boolean;
  // The connected account itself, which is how the dialog can lead with "your"
  // reply instead of listing it as one guest among many.
  self?: boolean;
  // Rooms and equipment are booked as attendees, so they are separated from the
  // people who were actually invited.
  resource?: boolean;
};

// A way into the meeting: a video room, a dial-in number, or the provider's
// own "more ways to join" page.
export type GoogleCalendarConferenceEntry = {
  kind: "video" | "phone" | "sip" | "more";
  label: string;
  uri: string;
  // What a phone entry point spells out beside the number, and what a video
  // room shows under its link.
  meetingCode?: string;
  pin?: string;
  regionCode?: string;
};

export type GoogleCalendarAttachment = {
  title: string;
  url: string;
};

// Everything the details dialog shows beyond the tile. It travels with the
// month load, so each field is capped rather than passed through whole.
export type GoogleCalendarEventDetails = {
  // Plain text. Google stores descriptions as HTML, which is flattened on the
  // server so nothing renders markup a guest wrote.
  description?: string;
  descriptionTruncated?: boolean;
  location?: string;
  tentative?: boolean;
  organizer?: GoogleCalendarPerson;
  attendees?: GoogleCalendarAttendee[];
  // The full head count, which stays right when the list itself is capped.
  attendeeCount?: number;
  // The same count without the rooms and equipment in it, which is the number
  // a reader means by "guests".
  guestCount?: number;
  conference?: GoogleCalendarConferenceEntry[];
  attachments?: GoogleCalendarAttachment[];
};

export type GoogleCalendarEvent = GoogleCalendarEventDetails & {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  // Wall-clock HH:MM in the calendar's own zone, so a timed event can show when
  // it runs. All-day events leave both unset.
  startTime?: string;
  endTime?: string;
  htmlLink?: string;
  // Set on one instance of a repeating Google event, naming the series it
  // belongs to. A workspace date published as a series is recognized by it.
  recurringEventId?: string;
};
