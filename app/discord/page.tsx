// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://discord.gg/8rPPQMtZCp",
  metadata: {
    title: "Ryan Meetup - Discord",
    description: "Join the Ryan Meetup Discord server!",
    canonical: "https://ryanmeetup.com/discord",
    image: {
      url: "https://ryanmeetup.com/group-photos/ryankickoff.png",
      width: 1600,
      height: 800,
    },
    keywords: [
      "ryan meetup discord",
      "ryan meetup chat",
      "ryan meetup community",
      "ryan discord server",
    ],
  },
});

export { metadata };
export default RedirectPage;
