// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://www.sonesta.com/sonesta-es-suites/ca/fountain-valley/sonesta-es-suites-huntington-beach-fountain-valley?isGroupCode=true&groupCode=091026RYAN_1&checkin=2026-09-10&checkout=2026-09-13",
  metadata: {
    title: "Ryan Meetup - Hotel",
    description: "Book the Ryan Meetup hotel block.",
    canonical: "https://ryanmeetup.com/hotel",
    image: {
      url: "https://ryanmeetup.com/meta/embassy.png",
      width: 4500,
      height: 2660,
    },
    keywords: [
      "ryan meetup hotel",
      "ryan meetup hotel block",
      "ryan meetup huntington beach hotel",
      "ryan meetup rooms",
      "ryan meetup sun soaked hotel",
      "ryan meetup x sun soaked",
      "ryan meetup x kaskade",
      "ryan meetup kaskade",
      "ryan meetup rave",
      "ryan rave",
    ],
  },
});

export { metadata };
export default RedirectPage;