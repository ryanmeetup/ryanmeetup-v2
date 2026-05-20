// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://partiful.com/e/qIoEYsF86UUJymsWNKkW",
  metadata: {
    title: "Ryan Meetup - Ryan Baseball Classic",
    description: "RSVP for the Ryan Baseball Classic.",
    canonical: "https://ryanmeetup.com/baseball",
    image: {
      url: "https://ryanmeetup.com/logos/2026RyanBaseballClassic.jpg",
      width: 1147,
      height: 655,
    },
    keywords: [
      "ryan baseball classic",
      "ryan meetup baseball",
      "ryan meetup rsvp",
      "ryan meetup minneapolis",
    ],
  },
});

export { metadata };
export default RedirectPage;
