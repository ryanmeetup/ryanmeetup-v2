// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://partiful.com/e/UhROHO0MxSrt5WEPfvXT",
  metadata: {
    title: "Ryan Meetup - Coaster Event",
    description: "RSVP for the Ryan Meetup coaster event.",
    canonical: "https://ryanmeetup.com/coaster",
    image: {
      url: "https://ryanmeetup.com/group-photos/ryankickoff.png",
      width: 1600,
      height: 800,
    },
    keywords: [
      "ryan meetup coaster",
      "ryan meetup rsvp",
      "ryan meetup event",
      "ryan meetup partiful",
    ],
  },
});

export { metadata };
export default RedirectPage;
