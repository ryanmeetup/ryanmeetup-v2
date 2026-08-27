"use client";

// Components
import { Event, Chapters, EventsSectionHeader } from "@/components/events";
import { CollapsibleYearSection } from "@/components/global";
import { DisclosureCard } from "@ryanmeetup/ui";

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
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 pt-1 md:grid-cols-2 xl:grid-cols-3 4xl:grid-cols-3">
          {events?.map((event, index) => (
            <Event key={index} event={event as RyanEvent} />
          ))}

          {title.includes("Upcoming Events") &&
            showChapters &&
            !pathname.includes("/chapters") && <Chapters />}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 pt-1 xl:grid-cols-2">
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
    isUpcomingMainSection &&
    showChapters &&
    chapterEventCount > 0 &&
    mainEventCount === 0;
  const displayCount =
    isUpcomingMainSection && showChapters ? mainEventCount : events.length;
  const eventCountLabel = hasOnlyChapterUpcoming
    ? formatEventCount(chapterEventCount, "chapter event")
    : formatEventCount(displayCount);
  const isPastEventsSection = title === "Past Events";
  const pastEventsByYear = isPastEventsSection
    ? events.reduce((groups, event) => {
        const year = formatMonthDay(event.date).year;
        const existing = groups.get(year);
        if (existing) {
          existing.push(event);
        } else {
          groups.set(year, [event]);
        }
        return groups;
      }, new Map<string, RyanEvent[]>())
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
          <CollapsibleYearSection
            key={year}
            id={`${pastYearAnchorPrefix}-${year}`}
            year={year}
            countLabel={formatEventCount(yearEvents.length)}
          >
            <Container
              eventType={eventType}
              events={yearEvents}
              title={title}
              showChapters={showChapters}
            />
          </CollapsibleYearSection>
        ))}
      </div>
    );
  };

  return (
    <div className="mb-10">
      {hidePastEvents ? (
        <DisclosureCard
          className="w-full"
          buttonClassName="mb-2 flex w-full items-center gap-x-4 text-left transition hover:underline"
          panelClassName="origin-top transition"
          summary={
            <EventsSectionHeader
              title={title}
              meta={eventCountLabel}
              action={headerAction}
            />
          }
        >
          {renderSectionContent()}
        </DisclosureCard>
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
