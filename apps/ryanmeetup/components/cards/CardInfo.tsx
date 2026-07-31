// Components
import { Heading, Text, Button, Card } from "@/components/global";
import { FaDollarSign as Dollar } from "react-icons/fa";

const CardInfo = () => {
  return (
    <Card
      variant="solid"
      size="lg"
      className="col-span-12 xl:col-span-6 h-full w-full text-left bg-black/90 text-white dark:bg-black/95"
    >
      <Heading
        className="text-2xl text-center title text-white lg:text-left lg:text-3xl font-semibold mb-4"
        size="h1"
      >
        Membership Cards
      </Heading>

      <section className="space-y-4 text-base text-white/80 lg:text-lg">
        <Text>
          Each purchase includes a customized anodized aluminum card that was
          designed by a Ryan and produced by a Ryan—just for you, Ryan.
        </Text>

        <Text>
          But it&apos;s more than just another flex on your non-Ryan
          friends. Your card comes with Ryan Pre-Check, letting you
          breeze past secu-Ry-ty at our events without having to show your Ry-D.
        </Text>

        <div className="text-white/70 tracking-wide font-medium mt-8">
          Price:{" "}
          <span className="relative group font-bold text-white hover:underline">
            $30 USD
          </span>
          ; includes free shipping.
        </div>
      </section>

      <section className="space-y-4 mt-8 text-base text-white/80 lg:text-lg">
        <Heading className="text-2xl title text-white" size="h2">
          Why this price?
        </Heading>

        <Text>
          This price allows us to cover the cost of production, shipping, and
          handling, while also supporting the ongoing development of the Ryan
          Meetup community. It also supports Ryan&apos;s work at Transition
          Marketing.
        </Text>

        <Text>
          Please allow 4-5 weeks for delivery, as each card is made to order.
        </Text>
      </section>

      <Button
        // href="https://buy.stripe.com/3cIcN4fTP7BS0kzbXJ2kw0a"
        leftIcon={<Dollar className="w-4 h-4" />}
        className="mt-8 w-full"
        variant="primary"
        size="md"
        disabled
      >
        ORDERS PAUSED UNTIL FURTHER NOTICE
      </Button>
    </Card>
  );
};

export { CardInfo };
