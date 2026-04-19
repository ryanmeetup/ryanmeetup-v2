import { Card, Text, Button } from "@/components/global";
import { BiMailSend as Send } from "react-icons/bi";
import {
  FaBullhorn as Megaphone,
  FaHandshake as Handshake,
  FaChartLine as Growth,
  FaInstagram as Instagram,
  FaMapMarkedAlt as Footprint,
  FaMicrophoneAlt as Mic,
  FaTshirt as Merch,
  FaVideo as Video,
} from "react-icons/fa";

const partnershipPerks = [
  {
    icon: <Megaphone className="h-4 w-4" />,
    text: "Logo placement across Ryan Meetup web properties for consistent public-facing visibility.",
  },
  {
    icon: <Merch className="h-4 w-4" />,
    text: "On-site signage, branded materials, and merch opportunities to put your brand in front of event attendees.",
  },
  {
    icon: <Footprint className="h-4 w-4" />,
    text: "City and chapter-specific sponsorship that help build local brand awareness for your business.",
  },
  {
    icon: <Instagram className="h-4 w-4" />,
    text: "Visibility across our Instagram audience of 105k+ followers and 3M+ monthly views.",
  },
  {
    icon: <Video className="h-4 w-4" />,
    text: "Mentions in recap videos and post-event storytelling that extend visibility beyond the event itself.",
  },
  {
    icon: <Growth className="h-4 w-4" />,
    text: "Ongoing partnerships that create more persistent brand visibility than a one-off event placement.",
  },
  {
    icon: <Handshake className="h-4 w-4" />,
    text: "Custom partnership ideas shaped around the right brand, event, or local activation.",
  },
  {
    icon: <Mic className="h-4 w-4" />,
    text: "Sponsor mentions and live event recognition when the format makes sense.",
  },
];

const PartnershipPerks = () => {
  return (
    <>
      <div className="sm:hidden">
        <details className="group">
          <summary className="mx-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-black/20 bg-white/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-black/80 shadow-sm transition hover:border-black/40 hover:bg-black/5 dark:border-white/20 dark:bg-white/10 dark:text-white/80 dark:hover:border-white/40 dark:hover:bg-white/10">
            View partnership perks
            <span className="text-xs leading-none transition-transform duration-200 group-open:rotate-180">
              ▼
            </span>
          </summary>
          <Card
            variant="soft"
            size="md"
            className="mt-4 grid w-full gap-4 text-left"
          >
            {partnershipPerks.map((item) => (
              <Card key={item.text} variant="solid" size="sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-black text-white dark:border-white/10 dark:bg-white dark:text-black">
                    {item.icon}
                  </span>
                  <Text className="text-sm text-black/70 dark:text-white/70">
                    {item.text}
                  </Text>
                </div>
              </Card>
            ))}
          </Card>
        </details>
      </div>
      <Card
        variant="soft"
        size="md"
        className="mx-auto hidden w-full gap-4 text-left sm:grid sm:grid-cols-2 xl:grid-cols-4"
      >
        <div className="sm:col-span-2 xl:col-span-4">
          <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-black/70 dark:text-white/70">
            Sponsor opportunities may include...
          </Text>
        </div>
        {partnershipPerks.map((item) => (
          <Card key={item.text} variant="solid" size="sm">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-black text-white dark:border-white/10 dark:bg-white dark:text-black">
                {item.icon}
              </span>
              <Text className="text-sm text-black/70 dark:text-white/70">
                {item.text}
              </Text>
            </div>
          </Card>
        ))}
      </Card>
      <div className="flex justify-center">
        <Button.Link
          href="/contact"
          leftIcon={<Send className="h-4 w-4" />}
          variant="primary"
          size="md"
          fullWidth
          newTab={false}
        >
          Talk sponsorship with us
        </Button.Link>
      </div>
    </>
  );
};

export { PartnershipPerks };
