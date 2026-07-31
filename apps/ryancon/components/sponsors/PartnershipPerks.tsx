import { Card, Text, Button } from "@/components/global";
import { BiMailSend as Send } from "react-icons/bi";
import {
  FaBullhorn as Megaphone,
  FaHandshake as Handshake,
  FaChartLine as Growth,
  FaUsers as Community,
  FaMicrophoneAlt as Mic,
  FaMapMarkedAlt as Footprint,
} from "react-icons/fa";

const partnershipPerks = [
  {
    icon: <Megaphone className="h-4 w-4" />,
    text: "Brand visibility at unforgettable events.",
  },
  {
    icon: <Footprint className="h-4 w-4" />,
    text: "Local activations that connect with Ryans.",
  },
  {
    icon: <Community className="h-4 w-4" />,
    text: "Community goodwill with a viral movement.",
  },
  {
    icon: <Handshake className="h-4 w-4" />,
    text: "Partnered storytelling across press and social.",
  },
  {
    icon: <Mic className="h-4 w-4" />,
    text: "On-site shoutouts and event integrations.",
  },
  {
    icon: <Growth className="h-4 w-4" />,
    text: "Audience growth through regional momentum.",
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
        className="mx-auto hidden w-full gap-4 text-left sm:grid sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="sm:col-span-3">
          <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-black/60 dark:text-white/60">
            Partnership perks
          </Text>
        </div>
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
      <div className="flex justify-center">
        <Button.Link
          href="/contact"
          leftIcon={<Send className="h-4 w-4" />}
          variant="primary"
          size="md"
          fullWidth
          newTab={false}
        >
          Partner with us
        </Button.Link>
      </div>
    </>
  );
};

export { PartnershipPerks };
