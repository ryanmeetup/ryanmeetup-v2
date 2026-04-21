"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

// Components
import { FilterBar, Text, Divider, Heading, Input, Card } from "@/components/global";
import { EventsSection } from "@/components/events";
import NextLink from "next/link";

// Types
import type { RyanEvent } from "@/lib/types";

// Utilities
import { sortEventsByDate, splitEventsByTime, toEndOfDayTime } from "@/utils/date";
import { buildEventSearchText, getEventEmptyMessage } from "@/utils/events";
import { useSearchFilter } from "@/hooks/useSearchFilter";

type EventsContainerProps = {
  events: RyanEvent[];
  eventType?: string;
  hidePastEvents?: boolean;
  showUpcomingSection?: boolean;
  showChapters?: boolean;
  displayMode?: "sectioned" | "flat";
  upcomingHeaderAction?: ReactNode;
  showSearch?: boolean;
  upcomingSectionId?: string;
  pastSectionId?: string;
  pastYearAnchorPrefix?: string;
};

const EventsContainer = (props: EventsContainerProps) => {
  const {
    events,
    eventType = "Main",
    hidePastEvents = false,
    showUpcomingSection = false,
    showChapters = true,
    displayMode = "sectioned",
    upcomingHeaderAction,
    showSearch = true,
    upcomingSectionId,
    pastSectionId,
    pastYearAnchorPrefix = "past-events",
  } = props;

  const { query, setQuery, filtered: filteredEvents } = useSearchFilter({
    data: events,
    buildHaystack: buildEventSearchText,
  });

  const eventsWithMeta = useMemo(
    () =>
      filteredEvents.map((event) => ({
        event,
        time: toEndOfDayTime(event.date),
        isMain: event.chapter.includes(eventType),
      })),
    [filteredEvents, eventType],
  );

  const renderEmptyUpcomingBanner = () => (
    <div className="mb-8">
      <Heading
        className="mb-4 text-center text-3xl title lg:text-4xl lg:text-left"
        size="h2"
      >
        Upcoming Events
      </Heading>
      <div className="space-y-4">
        <Text className="text-lg text-center secondary lg:text-left">
          {getEventEmptyMessage("upcoming")}
        </Text>
      </div>
      <Divider margins="lg" />
    </div>
  );

  if (displayMode === "flat") {
    const { upcoming, past } = splitEventsByTime(
      eventsWithMeta.map((item) => item.event),
    );
    const activeEvents = sortEventsByDate(upcoming, "asc");
    const inactiveEvents = sortEventsByDate(past, "desc");

    const showEmptyUpcomingBanner =
      showUpcomingSection &&
      activeEvents.length === 0 &&
      inactiveEvents.length !== 0;

    return (
      <div className="mb-10">
        {showSearch && (
          <FilterBar
            className="mb-6"
            search={
              <Input
                label="Search events"
                name="event-search"
                placeholder="Search by city, venue, or event name..."
                inputClassName="pr-4"
                onChange={(event) => setQuery(event.target.value)}
                value={query}
              />
            }
          />
        )}
        {showEmptyUpcomingBanner && renderEmptyUpcomingBanner()}

        {!showEmptyUpcomingBanner && activeEvents.length !== 0 && (
          <>
            <EventsSection
              title="Upcoming Events"
              events={activeEvents}
              eventType={eventType}
              showChapters={false}
              headerAction={upcomingHeaderAction}
              sectionId={upcomingSectionId}
            />
            {inactiveEvents.length !== 0 && <Divider margins="lg" />}
          </>
        )}

        {inactiveEvents.length !== 0 && (
          <EventsSection
            title="Past Events"
            events={inactiveEvents}
            eventType={eventType}
            hidePastEvents={hidePastEvents}
            showChapters={false}
            sectionId={pastSectionId}
            pastYearAnchorPrefix={pastYearAnchorPrefix}
          />
        )}
      </div>
    );
  }

  const mainEvents: RyanEvent[] = [];
  const chapterEvents: RyanEvent[] = [];
  const activeEvents: RyanEvent[] = [];
  const inactiveEvents: RyanEvent[] = [];

  for (const item of eventsWithMeta) {
    if (item.isMain) {
      mainEvents.push(item.event);
      const { upcoming } = splitEventsByTime([item.event]);
      if (upcoming.length) {
        activeEvents.push(item.event);
      } else {
        inactiveEvents.push(item.event);
      }
    } else {
      const { upcoming } = splitEventsByTime([item.event]);
      if (upcoming.length) {
        chapterEvents.push(item.event);
      }
    }
  }
  activeEvents.splice(0, activeEvents.length, ...sortEventsByDate(activeEvents, "asc"));
  chapterEvents.splice(
    0,
    chapterEvents.length,
    ...sortEventsByDate(chapterEvents, "asc"),
  );
  inactiveEvents.splice(
    0,
    inactiveEvents.length,
    ...sortEventsByDate(inactiveEvents, "desc"),
  );

  const showEmptyUpcomingBanner =
    showUpcomingSection &&
    activeEvents.length === 0 &&
    inactiveEvents.length !== 0;
  return (
    <div className="mb-10">
      {showSearch && (
        <FilterBar
          className="mb-6"
          search={
            <Input
              label="Search events"
              name="event-search"
              placeholder="Search by city, venue, or event name..."
              inputClassName="pr-4"
              onChange={(event) => setQuery(event.target.value)}
              value={query}
            />
          }
        />
      )}
      {showEmptyUpcomingBanner && renderEmptyUpcomingBanner()}

      {/* Only render the second block if we are NOT in the “empty banner” case */}
      {!showEmptyUpcomingBanner &&
        (activeEvents.length !== 0 || chapterEvents.length !== 0) && (
          <>
            <EventsSection
              title="Upcoming Events"
              events={activeEvents}
              eventType={eventType}
              showChapters={showChapters && chapterEvents.length !== 0}
              chapterEventCount={chapterEvents.length}
              mainEventCount={activeEvents.length}
              headerAction={upcomingHeaderAction}
              sectionId={upcomingSectionId}
            />
            {inactiveEvents.length !== 0 && <Divider margins="lg" />}
          </>
        )}

      {inactiveEvents.length !== 0 && (
        <EventsSection
          title="Past Events"
          events={inactiveEvents}
          eventType={eventType}
          hidePastEvents={hidePastEvents}
          showChapters={false}
          sectionId={pastSectionId}
          pastYearAnchorPrefix={pastYearAnchorPrefix}
        />
      )}

      {inactiveEvents.length === 0 && activeEvents.length === 0 && (
        <Card
          variant="solid"
          size="lg"
          className="-mt-8 text-center lg:text-left"
        >
          <div className="space-y-3">
            <Text className="text-lg secondary">
              There have not been any local Ryan Meetups in {eventType} yet.
            </Text>
            <Text className="text-lg secondary">
              Check back later once we officially launch this chapter!
            </Text>
          </div>
        </Card>
      )}
    </div>
  );
};

export { EventsContainer };
