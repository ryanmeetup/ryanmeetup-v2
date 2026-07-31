// Components
import { Layout } from "@/components/navigation";
import { Heading, Text, Pill } from "@/components/global";
import { SponsorSection, PartnershipPerks } from "@/components/sponsors";

// Types
import { Sponsor } from "@/lib/types";

// Utilities
import { fetchSponsors } from "@/actions/fetchContent";

const SponsorsPage = async () => {
  const sponsors = await fetchSponsors();

  return (
    <Layout className="space-y-12">
      <section className="space-y-6 text-center">
        <div className="flex justify-center">
          <Pill>Sponsors</Pill>
        </div>
        <Heading className="text-4xl title sm:text-5xl lg:text-6xl" size="h1">
          Ryan Meetup Sponsors
        </Heading>
        <Text className="mx-auto text-lg text-black/70 dark:text-white/70">
          Thanks to our incredible sponsors, Ryan Meetup has grown across the
          country. Want to help power the next one? We&apos;d love to partner with
          you.
        </Text>
        <PartnershipPerks />
      </section>

       {/*TODO: revamp RyanCon sponsor tiers  */}
      <SponsorSection sponsors={sponsors as Sponsor[]} tier="Founding" />
    </Layout>
  );
};

export default SponsorsPage;
