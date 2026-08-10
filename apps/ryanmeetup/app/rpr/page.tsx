// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://partiful.com/e/MsDK4dptZTsLD7Cod8LA",
  metadata: {
    title: "RSVP to Ready Player Ryan",
    description: "RSVP to Ready Player Ryan in Orange, California on September 11, 2026.",
    canonical: "https://ryanmeetup.com/rpr",
    image: {
      url: "https://ryanmeetup.com/dnb.PNG",
      width: 4168,
      height: 2340,
    },
    keywords: [
      "ryan meetup rpr",
      "ryan meetup ready player ryan",
      "ryan meetup orange california",
      "ryan meetup september 2026",
      "ryan meetup california",
      "ryan meetup los angeles",
      "ryan meetup la",
      "free ryan meetup"
    ],
  },
});

export { metadata };
export default RedirectPage;
