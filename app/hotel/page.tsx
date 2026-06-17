// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://www.sonesta.com/royal-sonesta/mn/minneapolis/royal-sonesta-minneapolis-downtown?isGroupCode=true&groupCode=G072226RYAN&checkin=2026-07-22&checkout=2026-07-27",
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
      "ryan meetup minneapolis hotel",
      "ryan meetup rooms",
    ],
  },
});

export { metadata };
export default RedirectPage;
