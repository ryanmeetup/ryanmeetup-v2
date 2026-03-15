"use client";

import { useMemo } from "react";

// Components
import { Sponsor } from "@/components/sponsors";
import { Heading, Text, Kicker } from "@/components/global";

// Types
import type { Sponsor as SponsorType } from "@/lib/types";

type SponsorSectionProps = {
  sponsors: SponsorType[];
  tier: string;
};

const SponsorSection = (props: SponsorSectionProps) => {
  const { sponsors, tier } = props;

  const sorted = useMemo(
    () => [...sponsors].sort((a, b) => b.eventsSponsored - a.eventsSponsored),
    [sponsors],
  );

  return (
    <section className="space-y-6" id={tier.toLowerCase()}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <Heading className="text-3xl title sm:text-4xl lg:text-5xl" size="h2">
          {tier} Sponsors
        </Heading>
        <Kicker>{sorted.length} partners</Kicker>
      </div>

      <Text className="text-base text-black/70 dark:text-white/70">
        {tier === "Founding" &&
          "Founding sponsors have gone above and beyond to support the Ryan Meetup with essential resources, funding, and visibility."}
        {tier === "Core" &&
          "Core sponsors show consistent support across multiple Ryan Meetups, helping us keep the momentum growing."}
        {tier === "Contributing" &&
          "Contributing sponsors help individual Ryan Meetups come to life with timely support and resources."}
      </Text>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((sponsor) => (
          <Sponsor
            key={sponsor.name as string}
            sponsor={sponsor as SponsorType}
            className="w-full"
          />
        ))}
      </div>
    </section>
  );
};

export { SponsorSection };
