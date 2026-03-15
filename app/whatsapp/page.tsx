// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://chat.whatsapp.com/LeI37a2AlMk0OmMfhXPNvq",
  metadata: {
    title: "Ryan Meetup - WhatsApp",
    description: "Join the official Ryan Meetup WhatsApp group.",
    canonical: "https://ryanmeetup.com/whatsapp",
    image: {
      url: "https://ryanmeetup.com/group-photos/ryankickoff.png",
      width: 1600,
      height: 800,
    },
    keywords: [
      "ryan meetup whatsapp",
      "ryan whatsapp",
      "ryan meetup group chat",
      "ryan meetup whatsapp group",
    ],
  },
});

export { metadata };
export default RedirectPage;
