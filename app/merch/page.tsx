// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://ryanmeetup.etsy.com",
  metadata: {
    title: "Ryan Meetup - Merch",
    description: "Buy official Ryan Meetup merchandise!",
    canonical: "https://ryanmeetup.com/merch",
    image: {
      url: "https://ryanmeetup.com/meta/merch.png",
      width: 2202,
      height: 1282,
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
