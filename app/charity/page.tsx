// Components
import { Layout } from "@/components/navigation";
import { Divider, Heading, Text, Card } from "@/components/global";
import { TotalCount, Donation } from "@/components/charity";

// Types
import { Charity } from "@/lib/types";
import { buildPageMetadata } from "@/utils/metadata";

// Utilities
import { fetchDonations } from "@/actions/fetchContent";

export const metadata = buildPageMetadata({
  title: "Ryan Meetup - Charity",
  description:
    "Ryan Meetup has raised money for various charitable organizations over the years.",
  canonical: "https://ryanmeetup.com/charity",
  siteName: "Ryan Meetup - Charity",
  image: {
    url: "https://ryanmeetup.com/meta/charity.jpg",
    width: 2188,
    height: 1458,
  },
  keywords: [
    "Ryan meetup charity",
    "ryan meetup donations",
    "ryan callahan foundation",
    "charitable organizations",
    "fundraising",
    "non-profits",
    "ryan meetup donate",
    "ryan meetup fundraising",
    "ryan meetup not-for-profit",
    "ryan meetup charity partners",
    "ryan meetup fundraising partners",
    "ryan meetup philanthropy",
  ],
});

const CharityPage = async () => {
  const donations = await fetchDonations();

  return (
    <Layout>
      <TotalCount donations={donations as Charity[]} />

      <Divider />


      <Heading size="h1" className="text-4xl text-center title">
        Our fundraising partners
      </Heading>
      <Text className="mt-3 text-base text-center text-black/70 dark:text-white/70 mb-8">
        The organizations we have rallied behind with Ryan Meetup donations.
      </Text>

      <section className="px-6 pb-20 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {donations.map((donation) => (
          <Donation
            key={donation.title as string}
            donation={donation as Charity}
            color="text-amber-600 dark:text-amber-300"
          />
        ))}
      </section>
    </Layout>
  );
};

export default CharityPage;
