// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://partiful.com/e/D0rd5gMOOWdwcXclkYro",
  metadata: {
    title: "Ryan Meetup - Sun Soaked",
    description: "RSVP to Ryan Meetup × Sun Soaked in Huntington Beach on September 12, 2026.",
    canonical: "https://ryanmeetup.com/sunsoaked",
    image: {
      url: "https://ryanmeetup.com/logos/sunny.png",
      width: 3362,
      height: 1200,
    },
    keywords: [
      "ryan meetup x sun soaked",
      "ryan meetup sun soaked",
      "ryan meetup huntington beach",
      "ryan meetup september 2026",
      "ryan meetup rave",
      "ryan rave",
      "ryan meetup california",
      "ryan meetup los angeles",
      "ryan meetup la",
      "ryan meetup tickets",
      "ryan meetup kaskade",
    ],
  },
});

export { metadata };
export default RedirectPage;
