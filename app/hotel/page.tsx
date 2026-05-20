// Utilities
import { createRedirectPage } from "@/utils/redirect";

const { metadata, RedirectPage } = createRedirectPage({
  url: "https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=MSPSSES&arrivalDate=2026-07-23&departureDate=2026-07-26&groupCode=CES901&room1NumAdults=1&cid=OM%2CWW%2CHILTONLINK%2CEN%2CDirectLink",
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
