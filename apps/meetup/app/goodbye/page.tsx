// Components
import { Heading } from "@/components/global";

// Types
import { buildPageMetadata } from "@/utils/metadata";

export const metadata = buildPageMetadata({
  title: "Ryan Meetup - No Bryans Allowed!",
  description: "No Bryans allowed at the Ryan Meetup!",
  canonical: "https://ryanmeetup.com/goodbye",
  image: {
    url: "https://ryanmeetup.com/group-photos/ryanroundup.png",
    width: 3284,
    height: 2189,
  },
  keywords: [
    "no bryans allowed",
    "ryan meetup rules",
    "ryan meetup bryan",
    "ryan meetup policy",
  ],
});

const GoodbyePage = () => {
  return (
    <div className="text-center flex flex-col justify-center items-center h-screen space-y-8 bg-white dark:bg-black">
      <div className="block space-y-20">
        <Heading className="text-5xl md:text-9xl" size="h1">
          Goodbye, Bryan.
        </Heading>

        <Heading className="text-4xl" size="h2">
          There are no Bryans allowed at the Ryan Meetup.
        </Heading>
      </div>
    </div>
  );
};

export default GoodbyePage;
