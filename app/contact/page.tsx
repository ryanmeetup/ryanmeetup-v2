import { Suspense } from "react";

// Components
import { Layout } from "@/components/navigation";
import { Text, Divider, Pill, Heading, Card } from "@/components/global";
import { ContactForm, FollowUs } from "@/components/contact";

// Types
import { buildPageMetadata } from "@/utils/metadata";

type ContactPageProps = {
  searchParams?: {
    subject?: string;
    message?: string;
  };
};

export const metadata = buildPageMetadata({
  title: "Ryan Meetup - Contact Us",
  description: "Get in contact with one of the Ryans here.",
  canonical: "https://ryanmeetup.com/contact",
  image: {
    url: "https://ryanmeetup.com/group-photos/ryankickoff.png",
    width: 1600,
    height: 800,
  },
  keywords: [
    "contact ryan",
    "contact ryan meetup",
    "ryan meetup email address",
    "official ryan business",
    "big and important ryan topics",
    "ryan",
    "ryan meetup",
    "ryan meetup contact",
    "ryan meetup email",
    "ryan meetup message",
  ],
});

const ContactPage = async ({ searchParams }: ContactPageProps) => {
  const initialSubject =
    typeof searchParams?.subject === "string" ? searchParams.subject : "";
  const initialMessage =
    typeof searchParams?.message === "string" ? searchParams.message : "";

  return (
    <Layout className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-6 shadow-[0_35px_70px_-50px_rgba(0,0,0,0.6)] dark:border-white/10 dark:bg-white/5 lg:p-10">
        <div className="absolute -right-24 -top-24 hidden h-64 w-64 rounded-full border border-black/10 bg-white/70 blur-3xl dark:border-white/10 dark:bg-white/10 lg:block" />
        <div className="absolute -bottom-24 left-10 hidden h-64 w-64 rounded-full border border-black/10 bg-white/60 blur-3xl dark:border-white/10 dark:bg-white/10 lg:block" />
        <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-6">
            <Pill>Contact</Pill>
            <Heading className="text-4xl title sm:text-5xl lg:text-6xl" size="h1">
              Contact the Ryans
            </Heading>
            <Text className="text-lg text-black/80 dark:text-white/80">
              One of our Ryans will get back to you as soon as we can.
            </Text>

            <FollowUs />
          </div>

          <Card
            variant="solid"
            size="lg"
            className="bg-white/95 shadow-[0_25px_50px_-40px_rgba(0,0,0,0.6)] dark:bg-black/80 dark:border-white/15"
          >
            <Heading className="text-2xl title" size="h2">
              Send a message
            </Heading>
            <Text className="mt-2 text-sm text-black/70 dark:text-white/70">
              We read every note, even if a Ryan takes a moment to reply.
            </Text>
            <div className="mt-6">
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
