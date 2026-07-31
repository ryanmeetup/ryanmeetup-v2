import type {
  ChampionRyan,
  ContentfulImage,
  RepeatRyan,
  TravelingRyan,
} from "@/lib/types";

const createImage = (url: string): ContentfulImage =>
  ({
    fields: {
      title: "Test Image",
      description: "",
      file: {
        url,
        fileName: "test.png",
        contentType: "image/png",
        details: {
          image: {
            height: 1,
            width: 1,
          },
          size: 1,
        },
      },
    },
  } as ContentfulImage);

const getAwardsFixture = () => {
  const farthest: TravelingRyan[] = [
    {
      fullName: "Ryan Traveler",
      headshot: createImage("/group-photos/ryanroundup.png"),
      traveledTo: "New York, NY",
      traveledFrom: "Los Angeles, CA",
      milesTraveled: 2450,
      event: "Ryan Roundup",
      date: new Date(),
      eventDate: "Jan 1, 2024",
      instagram: "https://www.instagram.com/ryantraveler/",
    },
  ];

  const champs: ChampionRyan[] = [
    {
      fullName: "Ryan Champion",
      headshot: createImage("/group-photos/ryanroundup.png"),
      event: "Ryan Royale",
      date: new Date(),
      eventDate: "Sep 1, 2024",
      title: "Little King",
      location: "New York, NY",
      instagram: "https://www.instagram.com/ryanchampion/",
    },
  ];

  const repeats: RepeatRyan[] = [
    {
      fullName: "Ryan Repeat",
      headshot: createImage("/group-photos/ryanroundup.png"),
      basedIn: "Chicago, IL",
      eventsAttended: ["Ryan Roundup", "Ryan Royale"],
    },
  ];

  return { farthest, champs, repeats };
};

export { getAwardsFixture };
