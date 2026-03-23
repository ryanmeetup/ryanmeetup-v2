// Components
import { Layout } from "@/components/navigation";
import { Event } from "@/components/events";
import { Blurb } from "@/components/global";
import { Divider, EmptyState, Text } from "@/components/global";

// Types
import { buildPageMetadata } from "@/utils/metadata";
import type { RyanEvent } from "@/lib/types";

// Utilities
import { fetchEvents } from "@/actions/fetchContent";
import { splitEventsByTime } from "@/utils/date";

export const metadata = buildPageMetadata({
  title: "Ryan Meetup - RSVP",
  description: "Ryan Meetup is coming to Minneapolis! RSVP to the Ryan Baseball Classic today.",
  canonical: "https://ryanmeetup.com/rsvp",
  image: {
    url: "https://ryanmeetup.com/logos/stryan3.PNG",
    width: 5761,
    height: 3240,
  },
  keywords: [
    "ryan meetup rsvp",
    "ryan meetup tickets",
    "ryan meetup event registration",
    "ryan meetup signup",
    "ryan baseball classic",
  ],
});

const RSVPPage = async () => {
  const events = (await fetchEvents()) as RyanEvent[];
  const mainEvents = events.filter((event) => event.chapter?.includes("Main"));
  const { upcoming } = splitEventsByTime(mainEvents);

  return (
    <Layout>
      <Blurb
        fullHeadline="Join us in Minneapolis!"
        smallHeadline="Join us in Minneapolis!"
        tag="RSVP"
      >
        <Text className="secondary text-lg mb-6 xl:mx-32">
          See you at this year&apos;s Ryan Baseball Classic, Ryan. In partnership with the Minnesota Twins.
        </Text>
      </Blurb>

      <Divider />

      <div className="mx-auto w-full max-w-5xl">
        {upcoming.length === 0 ? (
          <EmptyState message="Events not uploaded yet." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {upcoming.map((event, index) => (
              <Event key={index} event={event} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RSVPPage;
