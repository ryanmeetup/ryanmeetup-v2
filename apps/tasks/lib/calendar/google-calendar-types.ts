export type GoogleCalendarConnection = {
  connected: boolean;
  email?: string;
  connectedAt?: string;
  calendarId?: string;
};

export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink?: string;
  calendarName?: string;
};
