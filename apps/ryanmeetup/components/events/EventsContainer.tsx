"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

// Components
import { FilterBar, Divider, EmptyState, Heading, Input } from "@ryanmeetup/ui";
import { SearchIndicator } from "@/components/global";
import { EventsSection } from "@/components/events";
import NextLink from "next/link";

// Types
import type { RyanEvent } from "@/lib/types";

// Utilities
import {
  sortEventsByDate,
  splitEventsByTime,
  toEndOfDayTime,
} from "@/utils/date";
import { buildEventSearchText, getEventEmptyMessage } from "@/utils/events";
import { useSearchFilter } from "@ryanmeetup/hooks";

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

  const {
    query,
    setQuery,
    filtered: filteredEvents,
    isPending: isSearchPending,
  } = useSearchFilter({
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
    <div id={upcomingSectionId} className="mb-8 scroll-mt-24">
      <Heading
        className="mb-4 text-center text-3xl title lg:text-4xl lg:text-left"
        size="h2"
      >
        Upcoming Events
      </Heading>
      <EmptyState message={getEventEmptyMessage("upcoming")} />
      <Divider margins="lg" />
    </div>
  );

  const renderEmptyState = () => {
    const hasSearchQuery = query.trim().length > 0;

    const message = hasSearchQuery
      ? "No events match your search. Try another city, venue, or event name."
      : showSearch
        ? "There are no events to show right now. Check back soon for new Ryan Meetups."
        : `There have not been any local Ryan Meetups in ${eventType} yet. Check back later once we officially launch this chapter!`;

    return <EmptyState message={message} />;
  };

  const searchBar = showSearch ? (
    <FilterBar
      className="mb-6"
      search={
        <Input
          label="Search events"
          name="event-search"
          placeholder="Search by city, venue, or event name..."
          leadingIcon={<SearchIndicator isPending={isSearchPending} />}
          inputClassName="pr-4"
          onChange={(event) => setQuery(event.target.value)}
          value={query}
        />
      }
    />
  ) : null;

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
        {searchBar}
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

        {inactiveEvents.length === 0 &&
          activeEvents.length === 0 &&
          renderEmptyState()}
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
    } else if (showChapters) {
      const { upcoming } = splitEventsByTime([item.event]);
      if (upcoming.length) {
        chapterEvents.push(item.event);
      }
    }
  }
  activeEvents.splice(
    0,
    activeEvents.length,
    ...sortEventsByDate(activeEvents, "asc"),
  );
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
    chapterEvents.length === 0 &&
    inactiveEvents.length !== 0;
  return (
    <div className="mb-10">
      {searchBar}
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

      {inactiveEvents.length === 0 &&
        activeEvents.length === 0 &&
        chapterEvents.length === 0 &&
        renderEmptyState()}
    </div>
  );
};

export { EventsContainer };
