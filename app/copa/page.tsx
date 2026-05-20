// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://partiful.com/e/nJa43gzeVEPf06cvxZVS",
  metadata: {
    title: "Ryan Meetup - Copa del Ryan",
    description: "RSVP for Copa del Ryan.",
    canonical: "https://ryanmeetup.com/copa",
    image: {
      url: "https://ryanmeetup.com/group-photos/ryankickoff.png",
      width: 1600,
      height: 800,
    },
    keywords: [
      "copa del ryan",
      "ryan meetup copa",
      "ryan meetup rsvp",
      "ryan meetup soccer",
    ],
  },
});

export { metadata };
export default RedirectPage;
