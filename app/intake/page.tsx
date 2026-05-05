// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://form.typeform.com/to/TZkv7rua",
  metadata: {
    title: "Ryan Meetup - Chapter Lead Intake",
    description:
      "First-step intake form for prospective Ryan Meetup chapter leads.",
    canonical: "https://ryanmeetup.com/intake",
    image: {
      url: "https://ryanmeetup.com/meta/chapters.jpg",
      width: 1600,
      height: 900,
    },
    keywords: [
      "ryan meetup chapter lead intake",
      "ryan meetup chapters program",
      "ryan meetup chapter application",
      "start a ryan meetup chapter",
    ],
    robots: {
      index: false,
      follow: false,
    },
  },
});

export { metadata };
export default RedirectPage;
