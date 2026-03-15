"use client";

// Components
import { Heading, Text, Card } from "@/components/global";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Transition,
} from "@headlessui/react";
import { FaChevronDown as ChevronDown } from "react-icons/fa";

// Types
import type { FrequentlyAskedQuestion } from "@/lib/types";

type FAQProps = {
  data: FrequentlyAskedQuestion[];
  toggleable?: boolean;
  showTitle?: boolean;
  columns?: 1 | 2;
};

const FAQ = (props: FAQProps) => {
  const { data, toggleable = false, showTitle = false, columns = 1 } = props;

  return (
    <section className="relative overflow-hidden">
      <div className="relative">
        {showTitle && (
          <div className="mx-auto mb-8 text-center">
            <Heading className="text-4xl title sm:text-5xl">
              Frequently Asked Questions
            </Heading>
            <Text className="mt-3 text-base text-black/70 dark:text-white/70">
              Everything you&apos;re probably wondering before meeting up with other Ryans.
            </Text>
          </div>
        )}

        {columns === 2 ? (
          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            {[0, 1].map((column) => (
              <div key={column} className="space-y-4">
                {data
                  ?.filter((_, index) => index % 2 === column)
                  .map((pair, index) =>
                    toggleable ? (
                      <Disclosure as="div" key={`${column}-${index}`}>
                        {({ open }) => (
                          <Card variant="soft" size="sm">
                            <DisclosureButton className="flex w-full items-center justify-between gap-4 text-left text-lg font-semibold tracking-wider text-black transition hover:opacity-80 dark:text-white">
                              <span>{pair.question}</span>
                              <ChevronDown
                                className={`h-4 w-4 transition ${open && "-rotate-180"}`}
                              />
                            </DisclosureButton>
                            <div className="overflow-hidden">
                              <Transition
                                enter="duration-200 ease-in-out"
                                enterFrom="opacity-0 -translate-y-4"
                                enterTo="opacity-100 translate-y-0"
                                leave="duration-200 ease-in-out"
                                leaveFrom="opacity-100 translate-y-0"
                                leaveTo="opacity-0 -translate-y-4"
                              >
                                <DisclosurePanel className="origin-top pt-3">
                                  <Text className="text-sm text-black/70 dark:text-white/70">
                                    {pair.answer}
                                  </Text>
                                </DisclosurePanel>
                              </Transition>
                            </div>
                          </Card>
                        )}
                      </Disclosure>
                    ) : (
                      <Card
                        key={`${column}-${index}`}
                        variant="soft"
                        size="md"
                      >
                        <div className="text-base font-semibold tracking-wider text-black dark:text-white sm:text-lg">
                          {pair.question}
                        </div>
                        <div className="mt-2 text-sm text-black/70 dark:text-white/70 sm:text-base">
                          {pair.answer}
                        </div>
                      </Card>
                    ),
                  )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {data?.map((pair, index) =>
              toggleable ? (
                <Disclosure as="div" key={index}>
                  {({ open }) => (
                    <Card variant="soft" size="sm">
                      <DisclosureButton className="flex w-full items-center justify-between gap-4 text-left text-lg font-semibold tracking-wider text-black transition hover:opacity-80 dark:text-white">
                        <span>{pair.question}</span>
                        <ChevronDown
                          className={`h-4 w-4 transition ${open && "-rotate-180"}`}
                        />
                      </DisclosureButton>
                      <div className="overflow-hidden">
                        <Transition
                          enter="duration-200 ease-in-out"
                          enterFrom="opacity-0 -translate-y-4"
                          enterTo="opacity-100 translate-y-0"
                          leave="duration-200 ease-in-out"
                          leaveFrom="opacity-100 translate-y-0"
                          leaveTo="opacity-0 -translate-y-4"
                        >
                          <DisclosurePanel className="origin-top pt-3">
                            <Text className="text-sm text-black/70 dark:text-white/70">
                              {pair.answer}
                            </Text>
                          </DisclosurePanel>
                        </Transition>
                      </div>
                    </Card>
                  )}
                </Disclosure>
              ) : (
                <Card key={index} variant="soft" size="md">
                  <div className="text-base font-semibold tracking-wider text-black dark:text-white sm:text-lg">
                    {pair.question}
                  </div>
                  <div className="mt-2 text-sm text-black/70 dark:text-white/70 sm:text-base">
                    {pair.answer}
                  </div>
                </Card>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export { FAQ };
