import { describe, expect, it } from "vitest";

import {
  flattenGoogleHtml,
  googleAttendees,
  googleAttachments,
  googleConferenceEntries,
  googleEventDescription,
  googleEventPlace,
  googleEventRelativeWhen,
  googleEventWhen,
  googleNoteBlocks,
  googleResponseCounts,
  linkedTextParts,
  meetingProviderLabel,
  safeLinkUrl,
} from "@/lib/calendar/google-event-details";

describe("Google event descriptions", () => {
  it("flattens the HTML Google stores into readable text", () => {
    expect(
      flattenGoogleHtml(
        "<p>Agenda:</p><ul><li>Venue</li><li>Budget</li></ul><br><b>Bring notes</b>",
      ),
    ).toBe("Agenda:\n\n• Venue\n• Budget\n\nBring notes");
  });

  it("decodes entities after tags are stripped so escaped markup stays text", () => {
    expect(flattenGoogleHtml("Ryan &amp; Ryan &lt;3 &#39;the&#39; venue")).toBe(
      "Ryan & Ryan <3 'the' venue",
    );
    // A script block is dropped entirely rather than surfacing its source.
    expect(flattenGoogleHtml("<script>alert(1)</script>Hello")).toBe("Hello");
  });

  it("leaves an empty description unset instead of sending an empty value", () => {
    expect(googleEventDescription(undefined)).toEqual({});
    expect(googleEventDescription("<div> </div>")).toEqual({});
  });

  it("cuts a long description on a word boundary and says it was cut", () => {
    const long = `${"word ".repeat(60)}tail`;
    const result = googleEventDescription(long, 40);
    expect(result.descriptionTruncated).toBe(true);
    expect(result.description).toBe("word word word word word word word word…");
  });

  it("keeps a description that fits without marking it cut", () => {
    expect(googleEventDescription("Short note")).toEqual({
      description: "Short note",
    });
  });
});

describe("Google event joining details", () => {
  it("orders the video room ahead of dial-in and fallback entries", () => {
    const entries = googleConferenceEntries({
      conferenceData: {
        conferenceSolution: { name: "Google Meet" },
        entryPoints: [
          { entryPointType: "more", uri: "https://tel.meet/abc-defg-hij" },
          {
            entryPointType: "phone",
            uri: "tel:+1-555-555-5555",
            label: "+1 555-555-5555",
            pin: "1234",
          },
          {
            entryPointType: "video",
            uri: "https://meet.google.com/abc-defg-hij",
            meetingCode: "abc-defg-hij",
          },
        ],
      },
    });
    expect(entries.map((entry) => entry.kind)).toEqual(["video", "phone", "more"]);
    expect(entries[0]).toMatchObject({
      label: "Google Meet",
      uri: "https://meet.google.com/abc-defg-hij",
      meetingCode: "abc-defg-hij",
    });
    expect(entries[1]).toMatchObject({ label: "+1 555-555-5555", pin: "1234" });
  });

  it("falls back to the Hangout link and then to a meeting URL in the location", () => {
    expect(
      googleConferenceEntries({ hangoutLink: "https://meet.google.com/xyz" }),
    ).toEqual([
      { kind: "video", label: "Google Meet", uri: "https://meet.google.com/xyz" },
    ]);
    expect(
      googleConferenceEntries({ location: "Zoom: https://ryan.zoom.us/j/123" }),
    ).toEqual([
      { kind: "video", label: "Zoom", uri: "https://ryan.zoom.us/j/123" },
    ]);
    // A location that is only an address contributes no way to join.
    expect(googleConferenceEntries({ location: "The Ryan Bar, Brooklyn" })).toEqual([]);
  });

  it("drops entry points that are not a safe link or a dial-in number", () => {
    expect(
      googleConferenceEntries({
        conferenceData: {
          entryPoints: [
            { entryPointType: "video", uri: "javascript:alert(1)" },
            { entryPointType: "phone", uri: "tel:not-a-number" },
            { entryPointType: "sip", uri: "sip:room@example.com" },
          ],
        },
      }),
    ).toEqual([]);
  });

  it("names only known meeting hosts", () => {
    expect(meetingProviderLabel("https://teams.microsoft.com/l/meetup-join/x")).toBe(
      "Microsoft Teams",
    );
    expect(meetingProviderLabel("https://ryanmeetup.com/rsvp")).toBeNull();
    expect(safeLinkUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("Google event guests", () => {
  const attendees = [
    { email: "zoe@ryanmeetup.com", responseStatus: "declined" },
    { email: "room@resource.calendar.google.com", resource: true },
    { email: "adam@ryanmeetup.com", responseStatus: "accepted" },
    { email: "boss@ryanmeetup.com", responseStatus: "needsAction", organizer: true },
    { email: "me@ryanmeetup.com", responseStatus: "tentative", self: true },
    { displayName: "", email: "" },
  ];

  it("leads with the connected account, then the organizer, then replies", () => {
    const result = googleAttendees(attendees);
    expect(result.attendees?.map((attendee) => attendee.email)).toEqual([
      "me@ryanmeetup.com",
      "boss@ryanmeetup.com",
      "adam@ryanmeetup.com",
      "zoe@ryanmeetup.com",
      "room@resource.calendar.google.com",
    ]);
    expect(result.attendeeCount).toBe(5);
  });

  it("caps the list but still reports the real head count", () => {
    const result = googleAttendees(attendees, { limit: 2 });
    expect(result.attendees).toHaveLength(2);
    expect(result.attendeeCount).toBe(5);
  });

  it("counts replies without letting rooms skew them", () => {
    expect(googleResponseCounts(googleAttendees(attendees).attendees ?? [])).toEqual({
      accepted: 1,
      tentative: 1,
      needsAction: 1,
      declined: 1,
    });
  });

  it("treats an event with no guests as having none", () => {
    expect(googleAttendees(undefined)).toEqual({});
  });

  it("keeps only attachments that are safe links", () => {
    expect(
      googleAttachments([
        { title: "Agenda", fileUrl: "https://docs.google.com/document/d/1" },
        { title: "Bad", fileUrl: "javascript:alert(1)" },
      ]),
    ).toEqual([{ title: "Agenda", url: "https://docs.google.com/document/d/1" }]);
  });
});

describe("Google event timing", () => {
  it("names the day in full and labels the workspace zone", () => {
    expect(
      googleEventWhen({
        start: "2026-08-21",
        end: "2026-08-21",
        allDay: false,
        startTime: "09:00",
        endTime: "10:30",
      }),
    ).toBe("Friday, August 21, 2026 · 9:00 AM – 10:30 AM EDT");
  });

  it("spans both dates when an event runs past midnight", () => {
    expect(
      googleEventWhen({
        start: "2026-08-21",
        end: "2026-08-22",
        allDay: false,
        startTime: "22:00",
        endTime: "01:00",
      }),
    ).toBe("Fri, Aug 21, 10:00 PM – Sat, Aug 22, 1:00 AM EDT");
  });

  it("says all day instead of inventing hours", () => {
    expect(
      googleEventWhen({ start: "2026-08-21", end: "2026-08-21", allDay: true }),
    ).toBe("Friday, August 21, 2026 · All day");
    expect(
      googleEventWhen({ start: "2026-08-21", end: "2026-08-23", allDay: true }),
    ).toBe("Fri, Aug 21 – Sun, Aug 23 · All day");
  });
});

describe("Linking description text", () => {
  it("splits links out of prose without keeping the sentence punctuation", () => {
    expect(linkedTextParts("See https://ryanmeetup.com/venue, then reply.")).toEqual([
      { key: "text:0", text: "See " },
      { key: "link:4", text: "https://ryanmeetup.com/venue", url: "https://ryanmeetup.com/venue" },
      { key: "text:32", text: ", then reply." },
    ]);
  });

  it("leaves text with no links as a single part", () => {
    expect(linkedTextParts("Bring the deck")).toEqual([
      { key: "text:0", text: "Bring the deck" },
    ]);
  });
});

// The invite Teams writes when a meeting organized outside Workspace is
// mirrored onto a Google calendar: no conference data, everything in the body.
const teamsInvite = [
  "<div>____________________________________________________________</div>",
  "<div>Microsoft Teams meeting</div>",
  '<div>Join: <a href="https://teams.microsoft.com/meet/271183?p=IxtZY6">https://teams.microsoft.com/meet/271183?p=IxtZY6</a></div>',
  "<div>Meeting ID: 271 183 035 097 153</div>",
  "<div>Passcode: Mp7fD3KE</div>",
  "<div>______________________________</div>",
  '<div><a href="https://aka.ms/JoinTeamsMeeting">Need help?</a></div>',
  "<div>Dial in by phone</div>",
  '<div><a href="tel:+19292295233,,545797412">+1 929-229-5233,,545797412#</a> United States</div>',
  '<div><a href="https://dialin.teams.microsoft.com/x">Find a local number</a></div>',
].join("");

describe("Google event descriptions written by a meeting provider", () => {
  it("keeps the address of a link whose label does not spell it out", () => {
    const text = flattenGoogleHtml(teamsInvite);
    expect(text).toContain("Need help? (https://aka.ms/JoinTeamsMeeting)");
    expect(text).toContain("Find a local number (https://dialin.teams.microsoft.com/x)");
    // The label already is the address, so it is not repeated beside itself.
    expect(text).toContain("Join: https://teams.microsoft.com/meet/271183?p=IxtZY6");
    expect(text).not.toContain("271183?p=IxtZY6 (https://");
    // An address the dialog would refuse to link leaves its label behind.
    expect(text).toContain("+1 929-229-5233,,545797412# United States");
    expect(text).not.toContain("tel:");
  });

  it("turns a typed-out rule into a separator and drops a trailing one", () => {
    expect(googleNoteBlocks("Agenda\n_____________\nVenue\n_____________")).toEqual([
      { key: "text:1", kind: "text", text: "Agenda" },
      { key: "rule:1", kind: "rule" },
      { key: "text:3", kind: "text", text: "Venue" },
    ]);
    // A rule leading the description separates it from nothing.
    expect(googleNoteBlocks("=======\nNotes")).toEqual([
      { key: "text:13", kind: "text", text: "Notes" },
    ]);
    expect(googleNoteBlocks("Just notes")).toEqual([
      { key: "text:10", kind: "text", text: "Just notes" },
    ]);
  });

  it("lifts the room out of the body when Google filed no conference data", () => {
    expect(
      googleConferenceEntries({
        location: "Microsoft Teams Meeting; 2N-PAC",
        description: teamsInvite,
      }),
    ).toEqual([
      {
        kind: "video",
        label: "Microsoft Teams",
        uri: "https://teams.microsoft.com/meet/271183?p=IxtZY6",
        meetingCode: "271 183 035 097 153",
        pin: "Mp7fD3KE",
      },
      {
        kind: "phone",
        label: "+1 929-229-5233,,545797412#",
        uri: "tel:+1929-229-5233,,545797412#",
      },
    ]);
  });

  it("leaves an ordinary description alone", () => {
    expect(
      googleConferenceEntries({
        description: "<div>Agenda at <a href='https://ryanmeetup.com/x'>the doc</a>.</div>",
      }),
    ).toEqual([]);
    // A number in prose is not a dial-in when there is no room to dial into.
    expect(
      googleConferenceEntries({ description: "Call Ryan on +1 929-229-5233 if late" }),
    ).toEqual([]);
  });

  it("prefers what Google filed over what the body says", () => {
    expect(
      googleConferenceEntries({
        hangoutLink: "https://meet.google.com/abc-defg-hij",
        description: teamsInvite,
      }).map((entry) => entry.uri),
    ).toEqual(["https://meet.google.com/abc-defg-hij"]);
  });
});

describe("Google event rooms", () => {
  const invite = [
    { email: "kbateman1@darden.com", displayName: "Kelly Bateman", organizer: true },
    { email: "2n-pac@darden.com", displayName: "2N-PAC" },
    { email: "room@resource.calendar.google.com", displayName: "Studio" },
  ];
  const location = "Microsoft Teams Meeting; 2N-PAC";

  it("reads a room the organization booked on its own domain as a room", () => {
    const result = googleAttendees(invite, { location });
    expect(
      result.attendees?.map((attendee) => [attendee.email, attendee.resource]),
    ).toEqual([
      ["kbateman1@darden.com", undefined],
      ["2n-pac@darden.com", true],
      ["room@resource.calendar.google.com", true],
    ]);
    // The head count a reader means by "guests" leaves the rooms out of it.
    expect(result.attendeeCount).toBe(3);
    expect(result.guestCount).toBe(1);
  });

  it("does not mistake a guest for a room because the address names them", () => {
    const result = googleAttendees([{ email: "ryan@ryanmeetup.com", displayName: "Ryan" }], {
      location: "The Ryan Bar, Brooklyn",
    });
    expect(result.attendees?.[0]?.resource).toBeUndefined();
  });

  it("takes the rooms back out of the location so they print once", () => {
    expect(googleEventPlace(location, [{ name: "2N-PAC" }])).toBe(
      "Microsoft Teams Meeting",
    );
    // A location that was only its room has nothing left to say.
    expect(googleEventPlace("2N-PAC", [{ name: "2N-PAC" }])).toBeUndefined();
    expect(googleEventPlace("The Ryan Bar, Brooklyn", [])).toBe("The Ryan Bar, Brooklyn");
    expect(googleEventPlace(undefined, [])).toBeUndefined();
  });
});

describe("Google event timing", () => {
  const day = (start: string, end = start) => ({ start, end });

  it("says which side of today the event falls on", () => {
    expect(googleEventRelativeWhen(day("2026-08-21"), "2026-08-21")).toEqual({
      label: "Today",
      past: false,
    });
    // An event that started before today and has not ended is still today.
    expect(
      googleEventRelativeWhen(day("2026-08-19", "2026-08-23"), "2026-08-21"),
    ).toEqual({ label: "Today", past: false });
    expect(googleEventRelativeWhen(day("2026-08-22"), "2026-08-21").label).toBe(
      "Tomorrow",
    );
    expect(googleEventRelativeWhen(day("2026-08-14"), "2026-08-21")).toEqual({
      label: "7 days ago",
      past: true,
    });
    expect(googleEventRelativeWhen(day("2026-09-11"), "2026-08-21").label).toBe(
      "In 3 weeks",
    );
    expect(googleEventRelativeWhen(day("2026-01-21"), "2026-08-21").label).toBe(
      "7 months ago",
    );
  });
});
