// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://docs.google.com/forms/d/e/1FAIpQLSdS8O47kdOcmjXglOt_aGTs2q9qK6CrN4zGFdx62H10a-8kDg/viewform",
  metadata: {
    title: "Ryan Meetup - Newsletter",
    description: "Subscribe to the official Ryan Meetup newsletter.",
    canonical: "https://ryanmeetup.com/newsletter",
    image: {
      url: "https://ryanmeetup.com/meta/newsletter.png",
      width: 798,
      height: 373,
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
