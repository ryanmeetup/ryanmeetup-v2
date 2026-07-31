// Components
import { Layout } from "@/components/navigation";
import { AnchorNav, Heading, Text, Divider, Pill } from "@/components/global";
import { FarthestRyan, Champion, Leaderboard } from "@/components/awards";
import { MdLeaderboard as Leader } from "react-icons/md";
import { FaTrophy as Trophy, FaPlaneArrival as Plane } from "react-icons/fa";

// Types
import type { TravelingRyan, ChampionRyan, RepeatRyan } from "@/lib/types";
import { buildPageMetadata } from "@/utils/metadata";

// Utilities
import {
  fetchFarthestRyans,
  fetchChampionRyans,
  fetchRepeatRyans,
} from "@/actions/fetchContent";
import { getAwardsFixture } from "@/lib/test-fixtures/awards";

export const metadata = buildPageMetadata({
  title: "Ryan Meetup - Awards",
  description:
    "The Hall of Ryans honors farthest traveling Ryans, Ryan Meetup champions, and more.",
  canonical: "https://ryanmeetup.com/awards",
  siteName: "Ryan Meetup - Awards",
  image: {
    url: "https://ryanmeetup.com/trophy.png",
    width: 1000,
    height: 667,
  },
  keywords: [
    "award winners",
    "hall of ryans",
    "farthest traveling ryans",
    "who won at the ryan meetup",
    "ryan meetup tournament",
    "rytoberfest champion",
    "little kings",
    "little king of St. Ryans Day",
    "mr ryami",
    "ms. ryami",
    "ryan meetup awards",
    "ryan meetup winners",
    "ryan meetup leaderboard",
  ],
});

const AwardsPage = async () => {
  const fixture =
    process.env.E2E_TESTS === "true" ? getAwardsFixture() : null;
  const farthest = fixture?.farthest ?? (await fetchFarthestRyans());
  const champs = fixture?.champs ?? (await fetchChampionRyans());
  const repeats = fixture?.repeats ?? (await fetchRepeatRyans());

  const iconStyle = "h-5 w-5";

  const anchors = [
    {
      icon: <Plane className={iconStyle} />,
      href: "#farthest",
      tooltip: "Farthest Traveled",
    },
    {
      icon: <Trophy className={iconStyle} />,
      href: "#champions",
      tooltip: "Champions",
    },
    {
      icon: <Leader className={iconStyle} />,
      href: "#leaderboard",
      tooltip: "Leaderboard",
    },
  ];

  return (
    <Layout>
      <div className="relative space-y-12">
        <section className="space-y-4 text-center">
          <div className="flex justify-center">
            <Pill>Awards</Pill>
          </div>
          <Heading className="text-4xl title sm:text-5xl lg:text-6xl" size="h1">
            Hall of Ryans
          </Heading>
          <Text className="text-lg text-black/70 dark:text-white/70">
            Honoring the Ryans who traveled the farthest, earned top titles, and
            showed up again and again.
          </Text>
          <div id="farthest" />
        </section>
        
        <AnchorNav items={anchors} />

        <Divider />

        <section className="space-y-6">
          <Heading className="text-center text-3xl title sm:text-4xl">
            Farthest Traveling Ryans
          </Heading>          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {farthest?.map((ryan, index) => (
              <FarthestRyan key={index} ryan={ryan as unknown as TravelingRyan} />
            ))}
          </div>
          <div id="champions" />
        </section>

        <Divider margins="xl" />
        
        <section className="space-y-6">
          <div className="space-y-2 text-center">
            <Heading className="text-3xl title sm:text-4xl">
              Ryan Meetup Champions
            </Heading>
            <Text className="text-base text-black/70 dark:text-white/70">
              Ryans that overcame great obstacles to take home the championship
              titles.
            </Text>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {champs?.map((ryan, index) => (
              <Champion key={index} ryan={ryan as unknown as ChampionRyan} />
            ))}
          </div>
          <div id="leaderboard" />
        </section>

        <Divider margins="xl" />
        
        <section className="space-y-6">
          <Leaderboard ryans={repeats as RepeatRyan[]} />
        </section>
      </div>
    </Layout>
  );
};

export default AwardsPage;
