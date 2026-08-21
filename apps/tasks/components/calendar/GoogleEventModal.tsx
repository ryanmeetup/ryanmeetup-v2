"use client";

import type { ReactNode } from "react";
import { Avatar, Button, Modal } from "@ryanmeetup/ui";
import {
  FiAlignLeft,
  FiCalendar,
  FiExternalLink,
  FiLink,
  FiMapPin,
  FiPaperclip,
  FiPhone,
  FiRepeat,
  FiUsers,
  FiVideo,
} from "react-icons/fi";
import {
  googleAttendeeName,
  googleEventWhen,
  googleResponseCounts,
  googleResponseLabel,
  linkedTextParts,
} from "@/lib/calendar/google-event-details";
import type {
  GoogleCalendarAttendee,
  GoogleCalendarConferenceEntry,
  GoogleCalendarEvent,
  GoogleCalendarResponse,
} from "@/lib/calendar/google-calendar-types";

const responseStyles: Record<GoogleCalendarResponse, string> = {
  accepted:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/30 dark:text-emerald-200",
  tentative:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:border-amber-400/30 dark:text-amber-200",
  declined:
    "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:border-rose-400/30 dark:text-rose-200",
  needsAction:
    "border-black/15 bg-black/[0.04] text-black/60 dark:border-white/15 dark:bg-white/[0.07] dark:text-white/60",
};

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/55 dark:text-white/55">
        <span aria-hidden className="text-sm">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

// Description text arrives flattened from HTML, so the links inside it are
// rebuilt as real anchors instead of being handed back to the browser as markup.
function LinkedText({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-black/75 dark:text-white/75">
      {linkedTextParts(text).map((part) =>
        part.url ? (
          <a
            key={part.key}
            href={part.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"
          >
            {part.text}
          </a>
        ) : (
          <span key={part.key}>{part.text}</span>
        ),
      )}
    </p>
  );
}

function ConferenceRow({ entry }: { entry: GoogleCalendarConferenceEntry }) {
  const details = [
    entry.meetingCode && `Code ${entry.meetingCode}`,
    entry.pin && `PIN ${entry.pin}`,
    entry.regionCode,
  ].filter(Boolean);
  if (entry.kind === "video")
    return (
      <div className="rounded-xl border border-blue-500/25 bg-blue-500/[0.07] p-3 dark:border-blue-400/25 dark:bg-blue-400/10">
        <Button.Link href={entry.uri} newTab size="sm" fullWidth leftIcon={<FiVideo />}>
          Join {entry.label}
        </Button.Link>
        <p className="mt-2 truncate text-center text-[11px] text-black/55 dark:text-white/55">
          {details.length ? details.join(" · ") : entry.uri.replace(/^https?:\/\//, "")}
        </p>
      </div>
    );
  return (
    <a
      href={entry.uri}
      {...(entry.kind === "phone" ? {} : { target: "_blank", rel: "noreferrer" })}
      className="flex items-center gap-3 rounded-xl border border-black/10 bg-black/[0.025] px-3 py-2 text-sm transition hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07] dark:focus-visible:ring-white/40"
    >
      <span aria-hidden className="text-black/45 dark:text-white/45">
        {entry.kind === "phone" ? <FiPhone /> : <FiLink />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{entry.label}</span>
        {details.length > 0 && (
          <span className="block truncate text-[11px] text-black/55 dark:text-white/55">
            {details.join(" · ")}
          </span>
        )}
      </span>
    </a>
  );
}

function AttendeeRow({ attendee }: { attendee: GoogleCalendarAttendee }) {
  const name = googleAttendeeName(attendee);
  const note = [
    attendee.self && "You",
    attendee.organizer && "Organizer",
    attendee.optional && "Optional",
  ].filter(Boolean);
  return (
    <li className="flex items-center gap-3 py-1.5">
      <Avatar name={name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {name}
          {note.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-black/50 dark:text-white/50">
              {note.join(" · ")}
            </span>
          )}
        </span>
        {attendee.email && attendee.name && (
          <span className="block truncate text-xs text-black/55 dark:text-white/55">
            {attendee.email}
          </span>
        )}
      </span>
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${responseStyles[attendee.response]}`}
      >
        {googleResponseLabel(attendee.response)}
      </span>
    </li>
  );
}

/**
 * The full invite for one imported Google event. Clicking a tile lands here
 * instead of on Google, so the description, guest list, and joining details are
 * readable in place; Google itself stays one button away for anyone who needs
 * to reply to the invite or change it.
 */
export function GoogleEventModal({
  event,
  onClose,
}: {
  event: GoogleCalendarEvent | null;
  onClose: () => void;
}) {
  const attendees = event?.attendees ?? [];
  const people = attendees.filter((attendee) => !attendee.resource);
  const rooms = attendees.filter((attendee) => attendee.resource);
  const counts = googleResponseCounts(attendees);
  const guestSummary = [
    counts.accepted && `${counts.accepted} going`,
    counts.tentative && `${counts.tentative} maybe`,
    counts.declined && `${counts.declined} not going`,
    counts.needsAction && `${counts.needsAction} awaiting reply`,
  ]
    .filter(Boolean)
    .join(" · ");
  // The list is capped so one all-hands invite cannot dominate the month load.
  const hiddenGuests = Math.max(0, (event?.attendeeCount ?? 0) - attendees.length);
  const organizerName = event?.organizer?.name || event?.organizer?.email;
  const bare =
    event &&
    !event.description &&
    !event.location &&
    !event.conference?.length &&
    !event.attachments?.length &&
    !attendees.length;

  return (
    <Modal
      open={Boolean(event)}
      setIsOpen={(open) => {
        if (!open) onClose();
      }}
      size="lg"
      title={event?.title ?? "Google Calendar event"}
      description={event ? googleEventWhen(event) : undefined}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          {event?.htmlLink && (
            <Button.Link
              href={event.htmlLink}
              newTab
              size="sm"
              leftIcon={<FiExternalLink />}
            >
              Open in Google Calendar
            </Button.Link>
          )}
        </div>
      }
    >
      {event && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-black/60 dark:text-white/60">
            <span className="inline-flex items-center gap-1.5 font-semibold text-blue-800 dark:text-blue-200">
              <FiCalendar aria-hidden />
              Google Calendar
            </span>
            {event.recurringEventId && (
              <span className="inline-flex items-center gap-1.5">
                <FiRepeat aria-hidden />
                Part of a repeating event
              </span>
            )}
            {event.tentative && (
              <span className="inline-flex items-center gap-1.5">
                Marked tentative
              </span>
            )}
            {organizerName && <span className="truncate">Organized by {organizerName}</span>}
          </div>

          {event.conference && event.conference.length > 0 && (
            <Section icon={<FiVideo />} title="Join">
              <div className="space-y-2">
                {event.conference.map((entry) => (
                  <ConferenceRow key={entry.uri} entry={entry} />
                ))}
              </div>
            </Section>
          )}

          {event.location && (
            <Section icon={<FiMapPin />} title="Where">
              <LinkedText text={event.location} />
            </Section>
          )}

          {event.description && (
            <Section icon={<FiAlignLeft />} title="Notes">
              <LinkedText text={event.description} />
              {event.descriptionTruncated && (
                <p className="text-xs text-black/50 dark:text-white/50">
                  Shortened here. Open it in Google Calendar to read the rest.
                </p>
              )}
            </Section>
          )}

          {event.attachments && event.attachments.length > 0 && (
            <Section icon={<FiPaperclip />} title="Attachments">
              <ul className="space-y-1.5">
                {event.attachments.map((attachment) => (
                  <li key={attachment.url}>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:text-blue-300"
                    >
                      <FiPaperclip aria-hidden className="shrink-0" />
                      <span className="truncate">{attachment.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {people.length > 0 && (
            <Section
              icon={<FiUsers />}
              title={`Guests · ${event.attendeeCount ?? people.length}`}
            >
              {guestSummary && (
                <p className="text-xs text-black/55 dark:text-white/55">{guestSummary}</p>
              )}
              <ul className="divide-y divide-black/5 dark:divide-white/10">
                {people.map((attendee) => (
                  <AttendeeRow
                    key={attendee.email ?? googleAttendeeName(attendee)}
                    attendee={attendee}
                  />
                ))}
              </ul>
              {hiddenGuests > 0 && (
                <p className="text-xs text-black/50 dark:text-white/50">
                  {hiddenGuests} more {hiddenGuests === 1 ? "guest is" : "guests are"} on
                  this invite. Open it in Google Calendar for the full list.
                </p>
              )}
            </Section>
          )}

          {rooms.length > 0 && (
            <Section icon={<FiMapPin />} title="Rooms and equipment">
              <ul className="space-y-1 text-sm text-black/75 dark:text-white/75">
                {rooms.map((room) => (
                  <li key={room.email ?? googleAttendeeName(room)} className="truncate">
                    {googleAttendeeName(room)}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {bare && (
            <p className="rounded-xl border border-black/10 bg-black/[0.025] p-4 text-sm text-black/65 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65">
              Google shared nothing beyond the title and time for this event. Open it in
              Google Calendar if you expected notes or a guest list.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
