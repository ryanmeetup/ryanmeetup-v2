// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://partiful.com/e/D0rd5gMOOWdwcXclkYro",
  metadata: {
    title: "Ryan Meetup - RSVP",
    description: "RSVP to Ryan Meetup x Sun Soaked in Huntington Beach, CA, on September 12th.",
    canonical: "https://ryanmeetup.com/rsvp",
    image: {
      url: "https://ryanmeetup.com/logos/sunny.png",
      width: 3362,
      height: 1200,
    },
    keywords: [
      "ryan meetup rsvp",
      "ryan meetup sun soaked",
      "ryan meetup kaskade",
      "ryan meetup california",
      "when is the next ryan meetup",
      "ryan meetup tickets",
      "ryan meetup near me",
      "ryan rave",
    ],
  },
});

export { metadata };
export default RedirectPage;

// export const metadata = buildPageMetadata({
//   title: "Ryan Meetup - RSVP",
//   description:
//     "Find open RSVPs for upcoming Ryan Meetup events and sign up for announcements about future gatherings.",
//   canonical: "https://ryanmeetup.com/rsvp",
//   image: {
//     url: "https://ryanmeetup.com/group-photos/ryankickoff.png",
//     width: 1600,
//     height: 800,
//   },
//   keywords: [
//     "ryan meetup rsvp",
//     "ryan meetup tickets",
//     "ryan meetup event registration",
//     "ryan meetup signup",
//   ],
// });

// const RSVPPage = async ({
//   searchParams,
// }: {
//   searchParams?: { fixture?: string };
// }) => {
//   const events =
//     process.env.E2E_TESTS === "true"
//       ? getTestEvents(searchParams?.fixture)
//       : await fetchEvents();

//   const mainEvents = (events as RyanEvent[]).filter(isMainEvent);
//   const { upcoming } = splitEventsByTime(mainEvents);
//   const upcomingEvents = sortEventsByDate(upcoming, "asc");

//   return (
//     <Layout>
//       <Blurb
//         fullHeadline="Join the next Ryan Meetup"
//         smallHeadline="RSVP"
//         tag="RSVP"
//         href="/newsletter"
//         icon={<Email />}
//         hrefText="Get event updates"
//       >
//         <Text className="secondary text-xl mb-6 xl:mx-32">
//           Open RSVPs will appear here as new events are announced. Sign up for
//           event updates and we&apos;ll let you know when it&apos;s time to meet
//           more Ryans.
//         </Text>
//       </Blurb>

//       <Divider />

//       {upcomingEvents.length === 0 ? (
//         <EmptyState
//           variant="solid"
//           message="No RSVPs are open right now. Check back soon!"
//         />
//       ) : (
//         <UpcomingEventsList
//           events={upcomingEvents}
//           title="Upcoming Events"
//           displayMode="details"
//           headerMeta={`${upcomingEvents.length} open`}
//           headerAction={
//             <CalendarCheck className="h-5 w-5 text-black/60 dark:text-white/60" />
//           }
//         />
//       )}
//     </Layout>
//   );
// };
//
// export default RSVPPage;
