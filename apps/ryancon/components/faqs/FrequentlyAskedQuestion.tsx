"use client";

// Components
import { DisclosureCard, Heading, Text } from "@ryanmeetup/ui";

type FAQProps = {
  question: string;
  answer: string;
};

const FAQ = (props: FAQProps) => {
  const { question, answer } = props;

  return (
    <DisclosureCard
      className="w-full rounded-2xl border border-black/10 bg-white/80 shadow-sm transition hover:-translate-y-1 hover:border-black/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/40"
      buttonClassName="flex w-full items-center gap-4 px-5 py-5 text-center"
      panelClassName="px-5 pb-5"
      iconClassName="h-5 w-5"
      summary={
        <Heading size="h2" className="text-3xl title text-left flex-1">
          {question}
        </Heading>
      }
    >
      <Text className="text-base sm:text-lg">{answer}</Text>
    </DisclosureCard>
  );
};

export { FAQ };
