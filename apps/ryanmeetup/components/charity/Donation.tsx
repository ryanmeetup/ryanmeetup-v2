// Components
import NextLink from "next/link";
import NextImage from "next/image";
import { Text, Card, Button, Heading } from "@/components/global";

// Types
import type { Charity } from "@/lib/types";

// Utilities
import { convertImageUrl } from "@/utils/convert";

type DonationProps = {
  donation: Charity;
  color: string;
};

const Donation = (props: DonationProps) => {
  const { donation, color } = props;

  const { title, amount, href, avatars, hrefs } = donation;

  const parseCurrency = (amount: string) => {
    return parseFloat(amount.replace(/[^0-9.-]+/g, ""));
  };

  const fmt = (n: number) =>
    n.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

  return (
    <Card
      variant="soft"
      size="md"
      className="relative h-full overflow-hidden border border-black/10 bg-white/90 p-5 shadow-none ring-1 ring-black/10 sm:p-6 md:p-8 flex flex-col dark:border-white/10 dark:bg-white/5 dark:ring-white/10"
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `conic-gradient(from_140deg, ${color}33, transparent 65%)`,
        }}
      />
      <div className="relative flex h-full flex-col">
        <Heading className="text-xl sm:text-xl md:text-2xl font-semibold tracking-tight text-black dark:text-white mb-2" variant="normal">
          {title}
        </Heading>
        <div className="flex flex-1 items-center">
          <Text
            className="flex flex-wrap items-baseline gap-x-2 text-5xl font-extrabold tabular-nums"
          >
            <span className={`whitespace-nowrap text-4xl ${color}`}>
              {fmt(parseCurrency(amount))}
            </span>
            <span className="text-black/70 text-sm font-normal text-lg whitespace-nowrap mt-4 xl:mt-0 dark:text-white/80">
              Raised to date
            </span>
          </Text>
        </div>
        <div className="mt-5 sm:mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button.Link
            href={href}
            newTab
            size="sm"
            className="order-2 sm:order-none w-full sm:w-auto"
          >
            See organization
          </Button.Link>

          {avatars && hrefs && (
            <div className="order-1 sm:order-none flex flex-wrap justify-start gap-2 sm:flex-nowrap sm:justify-end gap-0 -space-x-4">
              {avatars.map((avatar, index) => (
                <NextLink
                  key={index}
                  href={hrefs[index]}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="w-8 h-8 rounded-full ring-2 relative overflow-hidden timing hover:scale-110 ring-black/15 dark:ring-white/20">
                    <NextImage
                      src={convertImageUrl(avatar) || "/ryanavatar.png"}
                      alt={avatar.fields.title}
                      className="object-cover"
                      fill
                      sizes="(min-width: 640px) 40px, 36px"
                    />
                  </div>
                </NextLink>
              ))}
            </div>
          )}  
        </div>
      </div>
    </Card>
  );
};

export { Donation };
