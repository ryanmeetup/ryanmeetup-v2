// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://docs.google.com/document/d/1P6fcP5mrHKMhzQ5lckbxo94JMEoHIogvLKhZ3wks8Z8/edit?tab=t.0#heading=h.l91gr6ixwskv",
  metadata: {
    title: "Ryan Meetup - Guidelines",
    description: "Guidelines for starting your own chapter of the Ryan Meetup.",
    canonical: "https://ryanmeetup.com/guidelines",
    image: {
      url: "https://ryanmeetup.com/group-photos/ryankickoff.png",
      width: 1600,
      height: 800,
    },
    keywords: [
      "ryan meetup guidelines",
      "ryan meetup chapter guide",
      "ryan meetup rules",
      "start a ryan meetup chapter",
    ],
  },
});

export { metadata };
export default RedirectPage;
