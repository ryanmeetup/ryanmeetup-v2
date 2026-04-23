// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://ryanmeetup.etsy.com",
  metadata: {
    title: "Ryan Meetup - Merch",
    description: "Buy official Ryan Meetup merchandise!",
    canonical: "https://ryanmeetup.com/merch",
    image: {
      url: "jpg",
      width: 2188,
      height: 1458,
    },
    keywords: [
      "ryan meetup merch",
      "ryan meetup store",
      "ryan meetup shirts",
      "ryan meetup gear",
    ],
  },
});

export { metadata };
export default RedirectPage;
