import { BiMailSend as Send } from "react-icons/bi";
import {
  FaBullhorn as Megaphone,
  FaCalendarAlt as Calendar,
  FaInstagram as Instagram,
} from "react-icons/fa";

import { Button, Card, Heading, Kicker, Text } from "@/components/global";

const sponsorshipTracks = [
  {
    title: "Recurring Sponsorships",
    price: "Starting at $250/month",
    description:
      "Built for brands that want a consistent presence while helping fund Ryan Meetup activity on an ongoing basis.",
    icon: <Megaphone className="h-4 w-4" />,
  },
  {
    title: "Event Sponsorships",
    price: "Starting at $1,000/event",
    description:
      "A fit for brands that want to support a specific meetup, city, chapter, or moment tied to a Ryan Meetup event.",
    icon: <Calendar className="h-4 w-4" />,
  },
];

const SponsorshipInfo = () => {
  return (
    <section className="space-y-6" id="sponsorship-info">
      <div className="space-y-3">
        <Kicker>How Sponsorship Works</Kicker>
        <Heading className="text-3xl title sm:text-4xl lg:text-5xl" size="h2">
          Sponsorship options with room to customize
        </Heading>
        <Text className="text-base text-black/70 dark:text-white/70">
          Ryan Meetup works with recurring sponsors and event sponsors. These
          starting points help qualify the conversation, but the exact shape of
          a partnership depends on fit, city, event scope, and how a brand wants
          to show up.
        </Text>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1.2fr_1fr]">
        {sponsorshipTracks.map((track) => (
          <Card key={track.title} variant="soft" size="lg" className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-black text-white dark:border-white/10 dark:bg-white dark:text-black">
                {track.icon}
              </span>
              <div className="space-y-1">
                <Heading className="text-2xl title" size="h3">
                  {track.title}
                </Heading>
                <Kicker className="tracking-[0.2em]">{track.price}</Kicker>
              </div>
            </div>
            <Text className="text-sm text-black/70 dark:text-white/70">
              {track.description}
            </Text>
          </Card>
        ))}

        <Card variant="solid" size="lg" className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-black text-white dark:border-white/10 dark:bg-white dark:text-black">
              <Instagram className="h-4 w-4" />
            </span>
            <div className="space-y-1">
              <Heading className="text-2xl title" size="h3">
                Sponsor Reach
              </Heading>
              <Kicker className="tracking-[0.2em]">Audience Snapshot</Kicker>
            </div>
          </div>
          <Text className="text-sm text-black/70 dark:text-white/70">
            Ryan Meetup can also bring digital visibility into the mix, with an
            Instagram audience of 105k+ followers and 3M+ monthly views.
          </Text>
          <Button.Link
            href="/contact"
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
    </section>
  );
};

export { SponsorshipInfo };
