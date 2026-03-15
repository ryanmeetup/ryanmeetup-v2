// Components
import { Heading, Text, Card, Kicker } from "@/components/global";

const BenefitsSection = () => {
  const benefits = [
    "Meet Ryans in your city and make instant connections.",
    "Get invites to unique meetups and themed events.",
    "Find your local chapter and help shape the community.",
    "Support a nonprofit led by Ryans, for Ryans.",
  ];
  const reasons = [
    "Celebrate the shared-name energy without the awkward icebreakers.",
    "Build a real-world network beyond group chats.",
    "Show up to memorable themed gatherings and pop-up surprises.",
    "Help Ryan Meetup reach record-breaking scale.",
  ];

  return (
    <section className="relative overflow-hidden">
      <Card className="p-6 lg:p-8" hover={false} size="md" variant="soft">
        <div className="space-y-4">
          <div className="space-y-2">
            <Kicker>Why join</Kicker>
            <Heading className="text-4xl title" size="h3">
              More than just a meetup.
            </Heading>
            <Text className="text-base text-black/70 dark:text-white/70">
              Connect with Ryans in your area and join events that bring the
              community together.
            </Text>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-black/80 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
                >
                  <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-black/70 dark:bg-white/70" />
                  <Text className="text-sm">{benefit}</Text>
                </div>
              ))}
            </div>
            <div className="grid gap-3">
              {reasons.map((reason) => (
                <div
                  key={reason}
                  className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-black/80 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
                >
                  <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-black/70 dark:bg-white/70" />
                  <Text className="text-sm">{reason}</Text>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
};

export { BenefitsSection };
