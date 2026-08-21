import { describe, expect, it } from "vitest";

import {
  flattenGoogleHtml,
  googleAttendees,
  googleAttachments,
  googleConferenceEntries,
  googleEventDescription,
  googleEventWhen,
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
    const result = googleAttendees(attendees, 2);
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
