// Components
import { UpcomingEventsList } from "@/components/events";
import { Layout } from "@/components/navigation";
import { Blurb, Divider, EmptyState, Text } from "@ryanmeetup/ui";
import { FaCalendarCheck as CalendarCheck } from "react-icons/fa6";
import { HiOutlineMail as Email } from "react-icons/hi";

// Types
import type { RyanEvent } from "@/lib/types";

// Utilities
import { sortEventsByDate, splitEventsByTime } from "@/utils/date";
import { fetchEvents } from "@/actions/fetchContent";
import { isMainEvent } from "@/utils/events";
import { getTestEvents } from "@/lib/test-fixtures/events";
import { buildPageMetadata } from "@/utils/metadata";

export const metadata = buildPageMetadata({
  title: "Ryan Meetup Returns to California | RSVP",
  description:
    "Ryan Meetup returns to California September 11–12, 2026. RSVP for Ready Player Ryan in Orange and Ryan Meetup × Sun Soaked in Huntington Beach.",
  canonical: "https://ryanmeetup.com/rsvp",
  image: {
    url: "https://ryanmeetup.com/logos/sunny.png",
    width: 3362,
    height: 1200,
  },
  keywords: [
    "ryan meetup rsvp",
    "ryan meetup california",
    "ryan meetup orange california",
    "ryan meetup huntington beach",
    "ready player ryan",
    "ryan meetup sun soaked",
    "ryan meetup tickets",
    "ryan meetup kaskade",
  ],
});

const RSVPPage = async ({
  searchParams,
}: {
  searchParams?: Promise<{ fixture?: string }>;
}) => {
  const resolvedSearchParams = await searchParams;
  const events =
    process.env.E2E_TESTS === "true"
      ? getTestEvents(resolvedSearchParams?.fixture)
      : await fetchEvents();

  const mainEvents = (events as RyanEvent[]).filter(isMainEvent);
  const { upcoming } = splitEventsByTime(mainEvents);
  const upcomingEvents = sortEventsByDate(upcoming, "asc");

  return (
    <Layout>
      <Blurb
        fullHeadline="Ryan Meetup returns to California"
        smallHeadline="California, here we come"
        tag="September 11–12, 2026"
        href="/newsletter"
        icon={<Email />}
        hrefText="Get event updates"
      >
        <Text className="secondary text-xl mb-6 xl:mx-32">
          We&apos;re heading west for two back-to-back main events: Ready Player
          Ryan in Orange, followed by Ryan Meetup × Sun Soaked in Huntington
          Beach. Pick one or make it a full Ryan weekend.
        </Text>
      </Blurb>

      <Divider />

      {upcomingEvents.length === 0 ? (
        <EmptyState
          variant="solid"
          message="No RSVPs are open right now. Check back soon!"
        />
      ) : (
        <UpcomingEventsList
          events={upcomingEvents}
          title="California RSVP lineup"
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
