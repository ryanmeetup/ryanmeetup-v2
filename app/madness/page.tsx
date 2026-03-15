// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://fantasy.espn.com/tc/sharer?challengeId=277&from=espn&context=GROUP_INVITE&edition=espn-en&groupId=e1839e81-44ec-41ad-afea-8de503957c36",
  metadata: {
    title: "Ryan Meetup - Madness",
    description: "Join the Ryan Meetup ESPN Tournament Challenge group.",
    canonical: "https://ryanmeetup.com/madness",
    image: {
      url: "https://ryanmeetup.com/logos/ryan_madness.png",
      width: 1643,
      height: 720,
    },
    keywords: [
      "ryan meetup madness",
      "ryan meetup bracket challenge",
      "ryan meetup espn tournament challenge",
      "ryan meetup march madness",
    ],
  },
});

export { metadata };
export default RedirectPage;
