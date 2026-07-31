// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://partiful.com/u/sJG4HpH0wS3ZA3YkzaL5",
  metadata: {
    title: "Ryan Meetup - Join",
    description: "Wanna meet other Ryans?",
    canonical: "https://ryanmeetup.com/join",
    image: {
      url: "https://ryanmeetup.com/group-photos/ryanroundup.png",
      width: 3284,
      height: 2189,
    },
    keywords: [
      "join ryan meetup",
      "ryan meetup rsvp",
      "ryan meetup signup",
      "ryan meetup tickets",
    ],
  },
});

export { metadata };
export default RedirectPage;
