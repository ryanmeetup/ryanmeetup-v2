// Components
import { ReachSnapshot } from "@/components/sponsors/ReachSnapshot";
import { Layout } from "@/components/navigation";
import NextLink from "next/link";
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Divider,
  Heading,
  Kicker,
  Text,
} from "@/components/global";
import { BiMailSend as Send } from "react-icons/bi";
import {
  FaBullhorn as WebsitePresence,
  FaBullhorn as Megaphone,
  FaCalendarAlt as Calendar,
  FaInfoCircle as Details,
  FaInstagram as Instagram,
  FaMapMarkedAlt as Footprint,
  FaMicrophoneAlt as Mic,
  FaTshirt as Merch,
  FaVideo as Video,
} from "react-icons/fa";
import { GoSponsorTiers as SponsorsIcon } from "react-icons/go";

// Types
import { buildPageMetadata } from "@/utils/metadata";
import { contactHrefs } from "@/utils/contact";

export const metadata = buildPageMetadata({
  title: "Ryan Meetup - Sponsorship Details",
  description:
    "Explore recurring and event sponsorship options for Ryan Meetup, including partnership opportunities, pricing starting points, and ways to get involved.",
  canonical: "https://ryanmeetup.com/sponsors/partnerships",
  image: {
    url: "https://ryanmeetup.com/meta/sponsors.png",
    width: 2056,
    height: 1162,
  },
  keywords: [
    "ryan meetup sponsorship details",
    "ryan meetup partnerships",
    "ryan meetup recurring sponsorship",
    "ryan meetup event sponsorship",
  ],
});

const partnershipFormats = [
  {
    title: "Recurring Sponsorship",
    icon: <Megaphone className="h-4 w-4" />,
    priceLabel: "Engagements start at",
    priceAmount: "$250/month",
    body:
      "Best for brands that want a longer-running relationship with Ryan Meetup instead of a single one-off logo placement. This is the clearest fit for organizations looking for repeated visibility over time.",
    note: "Final scope depends on visibility, cadence, and partnership fit.",
  },
  {
    title: "Event Sponsorship",
    icon: <Calendar className="h-4 w-4" />,
    priceLabel: "Engagements start at",
    priceAmount: "$1,000/event",
    body:
      "Best for brands that want to support a specific meetup, city, chapter, or activation. This can make sense when a business wants visibility tied to a concrete event or audience moment.",
    note: "Larger activations can scale based on event format and deliverables.",
  },
];

const opportunityAreas = [
  {
    key: "website-recognition",
    icon: <WebsitePresence className="h-4 w-4" />,
    title: (
      <>
        <span className="2xl:hidden">Website Recognition</span>
        <span className="hidden 2xl:inline">Get Recognized on RyanMeetup.com</span>
      </>
    ),
    bullets: [
      "Top placement on our sponsors page",
      "Featured visibility on our home page",
      "Broader brand presence across RyanMeetup.com and beyond",
    ],
  },
  {
    key: "onsite-event-visibility",
    icon: <Merch className="h-4 w-4" />,
    title: "Onsite Event Visibility",
    bullets: [
      "Signage at sponsored events",
      "Logo placement on event merch",
      "Giveaways and branded materials",
      "Get your brand in front of a dedicated audience, all of whom named Ryan"
    ],
  },
  {
    key: "local-market-reach",
    icon: <Footprint className="h-4 w-4" />,
    title: "Local Market Reach",
    bullets: [
      "Chapter-specific sponsorship",
      "City-level brand visibility",
      "Build brand awareness with a local audience of Ryans in your target market",
      "Ryans love to support Ryan-owned businesses, after all"
    ],
  },
  {
    key: "social-media-visibility",
    icon: <Instagram className="h-4 w-4" />,
    title: "Social Media Visibility",
    bullets: [
      "Instagram and TikTok exposure to our large audience of 105k+ followers",
      "Post, story, and recap opportunities",
      "Social inclusion where the fit makes sense",
    ],
  },
  {
    key: "post-event-visibility",
    icon: <Video className="h-4 w-4" />,
    title: "Post-Event Visibility",
    bullets: [
      "Recap video mentions",
      "Post-event storytelling",
      "Sponsor shoutouts after the event",
      "Have your brand included in potentially viral content that could reach millions"
    ],
  },
  {
    key: "live-event-recognition",
    icon: <Mic className="h-4 w-4" />,
    title: "Live Event Recognition",
    bullets: [
      "Sponsor mentions during events",
      "Recognition during speeches and ceremonies",
      "Acknowledgment in key event moments",
    ],
  },
];

const whyRyanMeetup = [
  {
    icon: <Megaphone className="h-4 w-4" />,
    title: "Recognizable Brand",
    description:
      "Ryan Meetup has grown into a recognizable brand with national visibility and a real-world presence that extends well beyond the internet.",
  },
  {
    icon: <Instagram className="h-4 w-4" />,
    title: "Strong Reach",
    description:
      "Our social audience drives repeat attention, and our website traffic reinforces sponsor visibility across multiple touch points. Not to mention, Ryans love to support Ryan-owned businesses.",
  },
  {
    icon: <Footprint className="h-4 w-4" />,
    title: "Local Relevance",
    description:
      "Brands can support Ryan Meetup broadly or focus on a specific chapter or event, which is especially useful for businesses targeting specific markets.",
  },
];

const nextSteps = [
  {
    step: "Step 01",
    title: "Start the conversation",
    body:
      "Reach out with a short note on your company, market, goals, and whether you are exploring recurring or event sponsorship.",
  },
  {
    step: "Step 02",
    title: "We define the fit",
    body:
      "We talk through the right sponsorship route, likely placements, timing, and the level of visibility that makes sense.",
  },
  {
    step: "Step 03",
    title: "We confirm the scope",
    body:
      "Once the fit is clear, we align on sponsorship level, deliverables, and the next steps to activate the partnership.",
  },
];

const SponsorPartnershipsPage = () => {
  return (
    <Layout className="space-y-12">
      <div className="flex flex-wrap gap-y-8">
        <div className="w-full xl:w-5/12 xl:pr-6">
          <div className="space-y-4 xl:sticky xl:top-28">
            <Card variant="soft" size="lg" className="space-y-5">
              <div className="space-y-3">
                {/* <Badge variant="secondary">Packages</Badge> */}
                <Heading className="text-3xl title sm:text-4xl" size="h2">
                  Sponsorship Options
                </Heading>
              </div>

              <div className="rounded-3xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/[0.03]">
                {partnershipFormats.map((item, index) => (
                  <div
                    key={item.title}
                    className={`space-y-3 px-5 py-4 ${
                      index < partnershipFormats.length - 1
                        ? "border-b border-black/10 dark:border-white/10"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-black text-white dark:border-white/10 dark:bg-white dark:text-black">
                        {item.icon}
                      </span>
                      <Heading className="text-2xl title" size="h3">
                        {item.title}
                      </Heading>
                    </div>

                    <Text className="text-sm text-black/70 dark:text-white/70">
                      {item.body}
                    </Text>

                    <div className="space-y-2 border-black/10 dark:border-white/10">
                      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-black/15 bg-black/10 px-3 py-1.5 shadow-sm dark:border-white/15 dark:bg-white/10">
                        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70 dark:text-white/70 sm:inline">
                          {item.priceLabel}
                        </span>
                        <span className="text-sm font-semibold tracking-[0.04em] text-black dark:text-white">
                          {item.priceAmount}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Divider />

              {/* <div className="rounded-3xl border border-black/10 bg-black/5 px-5 py-4 dark:border-white/10 dark:bg-white/[0.03]"> */}
                <div className="space-y-3">
                  <Heading className="text-2xl title" size="h3">
                    Ready to talk?
                  </Heading>
                  <Text className="text-sm text-black/70 dark:text-white/70">
                    If your team wants to talk through a recurring sponsorship
                    or an event sponsorship, send us a note and we can start
                    there.
                  </Text>
                  <Button.Link
                    href={contactHrefs.sponsorship}
                    leftIcon={<Send className="h-4 w-4" />}
                    variant="primary"
                    size="md"
                    fullWidth
                    newTab={false}
                  >
                    Get in contact
                  </Button.Link>
                  <Text className="text-xs text-black/60 dark:text-white/60">
                    If your brand has a more custom idea in mind, reach out
                    anyway. Recurring and event sponsorship are the main routes,
                    but the conversation can still be shaped around a strong
                    fit.
                  </Text>
                </div>
              {/* </div> */}
            </Card>
          </div>
        </div>

        <div className="w-full xl:w-7/12 xl:pl-6">
          <Breadcrumbs
            className="mb-1"
            crumbs={[
              {
                icon: <SponsorsIcon className="mr-2 h-4 w-4 fill-black dark:fill-white" />,
                href: "/sponsors",
                title: "Sponsors",
              },
              {
                icon: <Details className="mr-2 h-4 w-4 fill-black dark:fill-white" />,
                href: "/sponsors/partnerships",
                title: "Sponsorship Details",
              },
            ]}
          />

          <div className="space-y-12">
            <section className="space-y-5">
              <div className="space-y-3">
                {/* <Badge variant="secondary">Brand Value</Badge> */}
                <Heading className="text-3xl title sm:text-4xl lg:text-5xl" size="h2">
                  What your brand gets
                </Heading>
                <Text className="text-base text-black/70 dark:text-white/70">
                  Our sponsorship opportunities are built to create visible brand presence across the places our community already pays attention to the most: RyanMeetup.com, our live events, and our social content.
                </Text>
              </div>

              <div className="columns-1 gap-4 md:columns-2">
                {opportunityAreas.map((item) => (
                  <Card
                    key={item.key}
                    variant="soft"
                    size="lg"
                    className="mb-4 break-inside-avoid h-fit space-y-4"
                  >
                    <div className="flex items-center">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-black text-white dark:border-white/10 dark:bg-white dark:text-black">
                        {item.icon}
                      </span>
                      <Heading className="ml-4 text-2xl title" size="h3">
                        {item.title}
                      </Heading>
                    </div>

                    <ul className="space-y-2">
                      {item.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-3 text-sm text-black/70 dark:text-white/70"
                        >
                          <span className="mt-1.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-black/70 dark:bg-white/70" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </section>

            <Divider margins="xl" />

            <section className="space-y-6" id="costs">
              <div className="space-y-3">
                {/* <Badge variant="secondary">Why Ryan Meetup</Badge> */}
                <Heading className="text-3xl title sm:text-4xl lg:text-5xl" size="h2">
                  Why this makes sense for your brand
                </Heading>
                <Text className="text-base text-black/70 dark:text-white/70">
                  Ryan Meetup combines audience reach, in-person turnout, and a
                  growing local footprint rather than a single isolated
                  placement. For brands looking beyond standard corporate
                  sponsorship inventory, our distinct voice and internet
                  presence can create a more memorable kind of visibility.
                </Text>
              </div>

              <ReachSnapshot />

              <div className="space-y-5">
                <Kicker className="tracking-[0.18em]">Why It Matters</Kicker>

                <div className="space-y-6">
                  {whyRyanMeetup.map((item, index) => (
                    <div
                      key={item.title}
                      className={`space-y-3 ${
                        index < whyRyanMeetup.length - 1
                          ? "border-b border-black/10 pb-6 dark:border-white/10"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-black text-white dark:border-white/10 dark:bg-white dark:text-black">
                          {item.icon}
                        </span>
                        <div className="min-w-0 flex-1 space-y-3">
                          <Heading className="pt-1 text-[1.9rem] leading-[0.95] title" size="h3">
                            {item.title}
                          </Heading>

                          <Text className="text-sm leading-7 text-black/70 dark:text-white/70">
                            {item.description}
                          </Text>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <Divider margins="xl" />

            <section className="space-y-6" id="next-steps">
              <div className="space-y-3">
                {/* <Badge variant="secondary">Process</Badge> */}
                <Heading className="text-3xl title sm:text-4xl lg:text-5xl" size="h2">
                  What happens next
                </Heading>
                <Text className="text-base text-black/70 dark:text-white/70">
                  The starting prices on this page set a real baseline. From
                  there, the process is straightforward.
                </Text>
              </div>

              <Card variant="solid" size="lg" className="space-y-0">
                {nextSteps.map((item, index) => (
                  <div
                    key={item.step}
                    className={`flex gap-4 ${
                      index < nextSteps.length - 1 ? "pb-6" : ""
                    }`}
                  >
                    <div className="flex w-16 shrink-0 flex-col items-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-black text-[10px] font-semibold uppercase tracking-[0.2em] text-white dark:border-white/10 dark:bg-white dark:text-black">
                        {index + 1}
                      </span>
                      {index < nextSteps.length - 1 && (
                        <span className="mt-3 h-full w-px bg-black/10 dark:bg-white/10" />
                      )}
                    </div>

                    <div
                      className={`flex-1 space-y-2 ${
                        index < nextSteps.length - 1
                          ? "border-b border-black/10 pb-6 dark:border-white/10"
                          : ""
                      }`}
                    >
                      <Kicker className="tracking-[0.2em]">{item.step}</Kicker>
                      <Heading className="text-2xl title" size="h3">
                        {item.title}
                      </Heading>
                      <Text className="text-sm text-black/70 dark:text-white/70">
                        {item.body}
                      </Text>
                    </div>
                  </div>
                ))}
              </Card>
            </section>

            <Divider />

            <Card variant="soft" size="lg" className="space-y-4">
              <div className="space-y-2">
                <Heading className="text-2xl title" size="h3">
                  Ready to talk sponsorship?
                </Heading>
                <Text className="text-sm text-black/70 dark:text-white/70">
                  If Ryan Meetup feels like the right fit for your brand, send
                  us a note and we can talk through sponsorship goals, timing,
                  and the best structure for the partnership.
                </Text>
              </div>

              <Button.Link
                href={contactHrefs.sponsorship}
                leftIcon={<Send className="h-4 w-4" />}
                variant="primary"
                size="md"
                fullWidth
                newTab={false}
              >
                Get in contact
              </Button.Link>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SponsorPartnershipsPage;
