// Components
import { Layout } from "@/components/navigation";
import NextImage from "next/image";
import { Backdrop, Heading, Text, Pill, Card, Button } from "@/components/global";
import { CardInfo } from "@/components/cards";
import { layoutPaddingX } from "@/lib/constants";

// Types
import { buildPageMetadata } from "@/utils/metadata";
import { contactHrefs } from "@/utils/contact";

export const metadata = buildPageMetadata({
  title: "Buy Membership Card",
  description:
    "You've always been a member, and now you have the card to prove it.",
  canonical: "https://ryanmeetup.com/cards",
  image: {
    url: "https://ryanmeetup.com/meta/cards.png",
    width: 4032,
    height: 3024,
  },
  keywords: [
    "ryan meetup membership card",
    "ryan meetup card",
    "ryan meetup merch card",
    "ryan meetup membership",
  ],
});

const BuyCardsPage = () => {
  return (
    <Layout fullscreen>
      <Backdrop imageSrc="/backdrop.png">
        <section className={`grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center py-8 ${layoutPaddingX}`}>
          <div className="space-y-6">
            <Pill>Membership</Pill>
            <Heading className="text-4xl title sm:text-5xl lg:text-6xl" size="h1">
              The Ryan Meetup Membership Card
            </Heading>
            <Text className="text-lg text-black/70 dark:text-white/80">
              You’ve always been a member — now you can prove it.
            </Text>

            <div className="relative h-[360px] w-full sm:h-[480px]">
              <NextImage
                src="/cards.png"
                alt="Ryan Meetup Membership Card"
                className="object-contain"
                fill
              />
            </div>

            <Card
              variant="outline"
              size="sm"
              className="border-black/10 bg-white/80 text-black/70 dark:border-white/20 dark:bg-white/10 dark:text-white/80"
            >
              Shown: front / back of the membership card.
            </Card>
          </div>

          <div className="space-y-6">
            <CardInfo />
          </div>
        </section>
      </Backdrop>

      <section className={`py-10 ${layoutPaddingX}`}>
        <Card variant="soft" size="lg" className="text-center">
          <Heading className="text-3xl title sm:text-4xl">
            Need help with your order?
          </Heading>
          <Text className="mt-3 text-lg text-black/70 dark:text-white/70">
            We can help with orders, shipping questions, and card details.
          </Text>
          <div className="mt-6 flex justify-center">
            <Button.Link
              href={contactHrefs.cardsSupport}
              newTab={false}
              variant="secondary"
              size="md"
            >
              Get in touch
            </Button.Link>
          </div>
        </Card>
      </section>
    </Layout>
  );
};

export default BuyCardsPage;
