// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://partiful.com/e/ZWXe1yXdK1rAUMXz30Rc",
  metadata: {
    title: "Ryan Meetup - Iowa",
    description: "RSVP for the Ryan Meetup Iowa event.",
    canonical: "https://ryanmeetup.com/iowa",
    image: {
      url: "https://ryanmeetup.com/posters/iowa.png",
      width: 920,
      height: 1114,
    },
    keywords: [
      "ryan meetup iowa",
      "ryan meetup rsvp",
      "ryan meetup event",
      "ryan meetup partiful",
    ],
  },
});

export { metadata };
export default RedirectPage;
