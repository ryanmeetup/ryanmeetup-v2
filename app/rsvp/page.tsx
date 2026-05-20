// Components
import { Layout } from "@/components/navigation";
import { Blurb, Divider, EmptyState, Text } from "@/components/global";
import { UpcomingEventsList } from "@/components/events";
import { FaCalendarCheck as CalendarCheck } from "react-icons/fa6";
import { MdEmail as Email } from "react-icons/md";

// Types
import type { RyanEvent } from "@/lib/types";

// Utilities
import { fetchEvents } from "@/actions/fetchContent";
import { getTestEvents } from "@/lib/test-fixtures/events";
import { buildPageMetadata } from "@/utils/metadata";
import { sortEventsByDate, splitEventsByTime } from "@/utils/date";
import { isMainEvent } from "@/utils/events";

export const metadata = buildPageMetadata({
  title: "Ryan Meetup - RSVP",
  description:
    "RSVP for upcoming Ryan Meetup main events, including national gatherings and featured Ryan celebrations.",
  canonical: "https://ryanmeetup.com/rsvp",
  image: {
    url: "https://ryanmeetup.com/logos/2026RyanBaseballClassic.jpg",
    width: 1147,
    height: 655,
  },
  keywords: [
    "ryan meetup rsvp",
    "ryan meetup tickets",
    "ryan meetup event registration",
    "ryan meetup signup",
    "ryan baseball classic",
  ],
});

const RSVPPage = async ({
  searchParams,
}: {
  searchParams?: { fixture?: string };
}) => {
  const events =
    process.env.E2E_TESTS === "true"
      ? getTestEvents(searchParams?.fixture)
      : await fetchEvents();

  const mainEvents = (events as RyanEvent[]).filter(isMainEvent);
  const { upcoming } = splitEventsByTime(mainEvents);
  const upcomingEvents = sortEventsByDate(upcoming, "asc");

  return (
    <Layout>
      <Blurb
        fullHeadline="Join us in New York and Minneapolis!"
        smallHeadline="RSVP"
        tag="RSVP"
        href="/newsletter"
        icon={<Email />}
        hrefText="Get event updates"
      >
        <Text className="secondary text-xl mb-6 xl:mx-32">
          Hope to see you in New York or Minneapolis, Ryan. Why not consider joining us in both cities? 
        </Text>
      </Blurb>

      <Divider />

      {upcomingEvents.length === 0 ? (
        <EmptyState
          variant="solid"
          message="No main event RSVPs are open right now."
        />
      ) : (
        <UpcomingEventsList
          events={upcomingEvents}
          title="Upcoming Events"
          displayMode="details"
          headerMeta={`${upcomingEvents.length} open`}
          headerAction={
            <CalendarCheck className="h-5 w-5 text-black/60 dark:text-white/60" />
          }
        />
      )}
    </Layout>
  );
};

export default RSVPPage;
