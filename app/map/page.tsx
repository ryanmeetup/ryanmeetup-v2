import { Suspense } from "react";

// Components
import { Layout } from "@/components/navigation";
import { Mapbox, Info } from "@/components/map";

// Types
import type { Location } from "@/lib/types";
import { buildPageMetadata } from "@/utils/metadata";

// Utilities
import { fetchLocations } from "@/actions/fetchContent";
import { getMapFixtures } from "@/lib/test-fixtures/map";

export const metadata = buildPageMetadata({
  title: "Ryan Meetup - Map",
  description: "Ryan Meetup around the world.",
  canonical: "https://ryanmeetup.com/map",
  image: {
    url: "https://ryanmeetup.com/meta/map.png",
    width: 1355,
    height: 692,
  },
  keywords: [
    "ryan meetup world map",
    "ryan meetup worldwide",
    "ryan meetup world",
    "ryan meetup us",
    "ryan meetup england",
    "ryan meetup germany",
    "ryan meetup canada",
    "ryan meetup australia",
    "ryan meetup america",
    "ryan meetup map",
    "ryan meetup locations",
    "ryan meetup cities",
  ],
});

type MapPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const parseBooleanParam = (
  value: string | string[] | undefined,
  fallback: boolean,
) => {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (!normalized) {
    return fallback;
  }

  if (normalized === "1" || normalized === "true") {
    return true;
  }

  if (normalized === "0" || normalized === "false") {
    return false;
  }

  return fallback;
};

const MapPage = async ({ searchParams }: MapPageProps) => {
  const locations =
    process.env.E2E_TESTS === "true"
      ? getMapFixtures()
      : await fetchLocations();

  const showLegend = parseBooleanParam(searchParams?.legend, true);
  const showMeetups = parseBooleanParam(searchParams?.meetups, true);
  const showRyans = parseBooleanParam(searchParams?.hubs, true);
  const showNamedBusinesses = parseBooleanParam(searchParams?.named, true);
  const showOwnedBusinesses = parseBooleanParam(searchParams?.owned, true);
  const showChapters = parseBooleanParam(searchParams?.chapters, true);

  return (
    <Layout fullscreen>
      <Suspense fallback={null}>
        <Mapbox
          locations={locations as unknown as Location[]}
          showLegend={showLegend}
          initialShowMeetups={showMeetups}
          initialShowRyans={showRyans}
          initialShowNamedBusinesses={showNamedBusinesses}
          initialShowOwnedBusinesses={showOwnedBusinesses}
          initialShowChapters={showChapters}
        />
      </Suspense>
      <Info locations={locations as unknown as Location[]} />
    </Layout>
  );
};

export default MapPage;
