// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://partiful.com/e/qIoEYsF86UUJymsWNKkW",
  metadata: {
    title: "Ryan Meetup - RSVP",
    description:
      "RSVP for upcoming Ryan Meetup main events, including national gatherings and featured Ryan celebrations.",
    canonical: "https://ryanmeetup.com/baseball",
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
  },
});

export { metadata };
export default RedirectPage;
