// Components
import { Layout } from "@/components/navigation";
import { Blurb, Text, Divider } from "@/components/global";
import {
  SponsorSection,
  PartnershipPerks,
} from "@/components/sponsors";

// Types
import { Sponsor } from "@/lib/types";
import { buildPageMetadata } from "@/utils/metadata";

// Utilities
import { fetchSponsors } from "@/actions/fetchContent";

export async function generateMetadata() {
  const sponsors = await fetchSponsors();

  return buildPageMetadata({
    title: "Ryan Meetup - Sponsors",
    description:
      "Explore the brands supporting Ryan Meetup and learn how recurring and event sponsorship can help power future events, chapters, and community growth.",
    canonical: "https://ryanmeetup.com/sponsors",
    image: {
      url: "https://ryanmeetup.com/meta/sponsors.png",
      width: 2056,
      height: 1162,
    },
    keywords: [
      "ryan meetup",
      ...sponsors.map(
        (sponsor) => (sponsor.name as string)?.toLowerCase() || "",
      ),
      "ryan meetup sponsors",
      "ryan meetup sponsorship",
      "ryan meetup partners",
      "event sponsorship",
      "recurring sponsorship",
    ],
  });
}

const SponsorsPage = async () => {
  const sponsors = (await fetchSponsors()) as Sponsor[];

  const recurringSponsors = sponsors.filter(
    (sponsor) =>
      sponsor.partnershipType === "Recurring Sponsor" && sponsor.active,
  );
  const featuredBrandPartners = sponsors.filter(
    (sponsor) => sponsor.partnershipType === "Featured Brand Partner",
  );
  const communitySponsors = sponsors.filter(
    (sponsor) => sponsor.partnershipType === "Community Supporter",
  );

  return (
    <Layout className="space-y-12">
      <Blurb
        tag="Sponsors"
        fullHeadline="Help Power the Ryan Meetup"
        smallHeadline="Help Power the Ryan Meetup"
        fullHeadlineNode={
          <span className="mx-auto block leading-[0.95]">
            <span className="block">Help Power Ryan Meetup</span>
          </span>
        }
        smallHeadlineNode={
          <span className="mx-auto block max-w-[13ch] leading-[0.95]">
            <span className="block">Help Power</span>
            <span className="block">Ryan Meetup</span>
          </span>
        }
      >
        <div className="space-y-6">
          <Text className="mx-0 lg:mx-32 text-lg text-black/70 dark:text-white/70">
            Ryan Meetup is a growing community with real-world events, internet
            momentum, and a name brands do not forget. We work with sponsors who
            want to support the community on a recurring basis or help bring
            specific events to life.
          </Text>
          <PartnershipPerks detailsHref="/sponsors/partnerships" />
        </div>
      </Blurb>

      <Divider margins="xl" />

      <SponsorSection
        id="recurring-sponsors"
        title="Recurring Sponsors"
        kicker="Active ongoing partners"
        description="Brands providing ongoing financial support to Ryan Meetup on a recurring basis."
        sponsors={recurringSponsors}
        emptyMessage="Recurring sponsorships are now open for brands that want to support Ryan Meetup on an ongoing monthly basis."
      />

      <Divider margins="xl" />

      <SponsorSection
        id="featured-brand-partners"
        title="Featured Brand Partners"
        kicker="Notable brands we've worked with"
        description="Brands we've worked with through notable sponsorships, collaborations, and event support."
        sponsors={featuredBrandPartners}
        sponsorSize="featured"
        emptyMessage="Featured brand partners will appear here as sponsor entries are updated in Contentful."
      />

      <Divider margins="xl" />

      <SponsorSection
        id="community-supporters"
        title="Community Supporters"
        kicker="Curated acknowledgements"
        description="Brands and supporters who have contributed through one-off support, in-kind donations, introductions, or other meaningful help."
        sponsors={communitySponsors}
        sponsorSize="compact"
        emptyMessage="Community supporters will appear here as sponsor entries are updated in Contentful."
      />

      <Divider margins="xl" />
    </Layout>
  );
};

export default SponsorsPage;
