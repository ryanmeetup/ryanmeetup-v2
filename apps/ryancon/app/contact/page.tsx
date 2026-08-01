import { Suspense } from "react";

import { Layout } from "@/components/navigation";
import { ContactForm, FollowUs } from "@/components/contact";
import { Card, Heading, Pill, Text } from "@ryanmeetup/ui";

type ContactPageProps = {
  searchParams?: Promise<{
    subject?: string | string[];
    message?: string | string[];
  }>;
};

const ContactPage = async ({ searchParams }: ContactPageProps) => {
  const resolvedSearchParams = await searchParams;
  const initialSubject =
    typeof resolvedSearchParams?.subject === "string"
      ? resolvedSearchParams.subject
      : "";
  const initialMessage =
    typeof resolvedSearchParams?.message === "string"
      ? resolvedSearchParams.message
      : "";

  return (
    <Layout className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-6 shadow-[0_35px_70px_-50px_rgba(0,0,0,0.6)] dark:border-white/10 dark:bg-white/5 lg:p-10">
        <div className="absolute -right-24 -top-24 hidden h-64 w-64 rounded-full border border-black/10 bg-white/70 blur-3xl dark:border-white/10 dark:bg-white/10 lg:block" />
        <div className="absolute -bottom-24 left-10 hidden h-64 w-64 rounded-full border border-black/10 bg-white/60 blur-3xl dark:border-white/10 dark:bg-white/10 lg:block" />
        <div className="relative grid gap-10 xl:grid-cols-[1.05fr_0.95fr] xl:items-center xl:gap-16">
          <div className="space-y-6 xl:flex xl:self-stretch xl:flex-col xl:space-y-0 xl:py-6">
            <div className="space-y-6">
              <Pill>RyanCon</Pill>
              <Heading
                className="text-4xl title sm:text-5xl lg:text-6xl"
                size="h1"
              >
                Contact RyanCon
              </Heading>
              <Text className="text-lg text-black/80 dark:text-white/80">
                Questions about attending, sponsorships, programming, press,
                volunteering, or RyanCon logistics? Send the RyanCon team a note
                and one of our Ryans will get back to you soon.
              </Text>
            </div>

            <div className="xl:mt-auto xl:pt-10">
              <FollowUs />
            </div>
          </div>

          <Card
            variant="solid"
            size="lg"
            className="bg-white/95 shadow-[0_25px_50px_-40px_rgba(0,0,0,0.6)] dark:border-white/15 dark:bg-black/80 xl:bg-gradient-to-br xl:from-white/95 xl:to-white/75 xl:p-8 xl:shadow-[0_30px_70px_-45px_rgba(0,0,0,0.75)] dark:xl:from-white/10 dark:xl:to-white/[0.03]"
          >
            <Heading className="text-2xl title xl:text-3xl" size="h2">
              Send a message
            </Heading>
            <Text className="mt-2 max-w-xl text-sm text-black/70 dark:text-white/70 xl:text-base">
              We read every note, even if a Ryan takes a moment to reply.
            </Text>
            <div className="mt-6 xl:border-t xl:border-black/10 xl:pt-6 dark:xl:border-white/10">
              <Suspense fallback={null}>
                <ContactForm
                  initialSubject={initialSubject}
                  initialMessage={initialMessage}
                />
              </Suspense>
            </div>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default ContactPage;
