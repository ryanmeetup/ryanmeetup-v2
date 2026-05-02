// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://ryanmeetup.kit.com/49a74eff6b",
  metadata: {
    title: "Ryan Meetup - Newsletter",
    description: "Subscribe to the official Ryan Meetup newsletter.",
    canonical: "https://ryanmeetup.com/newsletter",
    image: {
      url: "https://ryanmeetup.com/meta/newsletter.png",
      width: 1760,
      height: 912,
    },
    keywords: [
      "ryan meetup newsletter",
      "ryan meetup updates",
      "ryan meetup email list",
      "ryan meetup news",
    ],
  },
});

export { metadata };
export default RedirectPage;
