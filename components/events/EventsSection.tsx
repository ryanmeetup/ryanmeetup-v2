"use client";

// Components
import { Event, Chapters, EventsSectionHeader } from "@/components/events";
import { Heading } from "@/components/global";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Transition,
} from "@headlessui/react";
import { FaChevronDown as ChevronDown } from "react-icons/fa";

// Types
import type { RyanEvent } from "@/lib/types";

// Utilities
import { usePathname } from "next/navigation";
import { formatEventCount, formatMonthDay } from "@/utils/date";

type EventsSectionProps = {
  events: RyanEvent[];
  title: string;
  eventType: string;
  hidePastEvents?: boolean;
  showChapters: boolean;
  chapterEventCount?: number;
  mainEventCount?: number;
  headerAction?: React.ReactNode;
  sectionId?: string;
  pastYearAnchorPrefix?: string;
};

type ContainerProps = {
  eventType: string;
  events: RyanEvent[];
  title: string;
  showChapters: boolean;
};

const Container = (props: ContainerProps) => {
  const { eventType, events, title, showChapters } = props;

  const pathname = usePathname();

  return (
    <div>
      {eventType === "Main" ? (
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2 xl:grid-cols-3 4xl:grid-cols-3">
          {title.includes("Upcoming Events") &&
            showChapters &&
            !pathname.includes("/chapters") && <Chapters />}

          {events?.map((event, index) => (
            <Event key={index} event={event as RyanEvent} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 xl:grid-cols-2">
          {events?.map((event, index) => (
            <Event key={index} event={event as RyanEvent} />
          ))}
        </div>
      )}
    </div>
  );
};

const EventsSection = (props: EventsSectionProps) => {
  const {
    events,
    title,
    eventType,
    hidePastEvents = false,
    showChapters,
    chapterEventCount = 0,
    mainEventCount = events.length,
    headerAction,
    sectionId,
    pastYearAnchorPrefix = "past-events",
  } = props;

  const isUpcomingMainSection =
    title === "Upcoming Events" && eventType === "Main";
  const hasOnlyChapterUpcoming =
    isUpcomingMainSection && showChapters && chapterEventCount > 0 && mainEventCount === 0;
  const displayCount =
    isUpcomingMainSection && showChapters
      ? mainEventCount
      : events.length;
  const eventCountLabel = hasOnlyChapterUpcoming
    ? formatEventCount(chapterEventCount, "chapter event")
    : formatEventCount(displayCount);
  const isPastEventsSection = title === "Past Events";
  const pastEventsByYear = isPastEventsSection
    ? events.reduce(
        (groups, event) => {
          const year = formatMonthDay(event.date).year;
          const existing = groups.get(year);
          if (existing) {
            existing.push(event);
          } else {
            groups.set(year, [event]);
          }
          return groups;
        },
        new Map<string, RyanEvent[]>(),
      )
    : null;

  const renderSectionContent = () => {
    if (!isPastEventsSection || !pastEventsByYear) {
      return (
        <Container
          eventType={eventType}
          events={events}
          title={title}
          showChapters={showChapters}
        />
      );
    }

    return (
      <div className="space-y-8">
        {Array.from(pastEventsByYear.entries()).map(([year, yearEvents]) => (
          <Disclosure key={year} as="div" className="w-full" defaultOpen>
            {({ open }) => (
              <div className="space-y-4">
                <DisclosureButton
                  id={`${pastYearAnchorPrefix}-${year}`}
                  className="flex w-full items-center justify-between gap-4 border-b border-black/10 pb-3 text-left transition hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
                >
                  <div className="flex items-baseline gap-3">
                    <Heading className="text-2xl title sm:text-3xl" size="h3">
                      {year}
                    </Heading>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55 dark:text-white/55">
                      {formatEventCount(yearEvents.length)}
                    </span>
                  </div>

                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-black/55 timing dark:text-white/55 ${open && "-rotate-180"}`}
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
                    <DisclosurePanel className="origin-top transition">
                      <Container
                        eventType={eventType}
                        events={yearEvents}
                        title={title}
                        showChapters={showChapters}
                      />
                    </DisclosurePanel>
                  </Transition>
                </div>
              </div>
            )}
          </Disclosure>
        ))}
      </div>
    );
  };

  return (
    <div className="mb-10">
      {hidePastEvents ? (
        <Disclosure as="div" className="w-full">
          {({ open }) => (
            <>
              <DisclosureButton className="gap-x-4 mb-2 w-full flex items-center hover:underline hover:scale-102 timing">
                <div className="flex-1">
                  <EventsSectionHeader
                    title={title}
                    meta={eventCountLabel}
                    action={headerAction}
                  />
                </div>

                <div className="flex justify-end">
                  <ChevronDown className={`timing ${open && "-rotate-180"}`} />
                </div>
              </DisclosureButton>

              <div className="overflow-hidden">
                <Transition
                  enter="duration-200 ease-in-out"
                  enterFrom="opacity-0 -translate-y-6"
                  enterTo="opacity-100 translate-y-0"
                  leave="duration-300 ease-in-out"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 -translate-y-6"
                >
                  <DisclosurePanel className="origin-top transition">
                    {renderSectionContent()}
                  </DisclosurePanel>
                </Transition>
              </div>
            </>
          )}
        </Disclosure>
      ) : (
        <div>
          {sectionId && <div id={sectionId} className="-translate-y-24" />}
          <EventsSectionHeader
            className="mb-4"
            title={title}
            meta={eventCountLabel}
            action={headerAction}
          />

          {renderSectionContent()}
        </div>
      )}
    </div>
  );
};

export { EventsSection };
