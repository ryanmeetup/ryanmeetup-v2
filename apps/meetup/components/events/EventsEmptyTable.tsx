"use client";

import { Card, EmptyState } from "@/components/global";
import { EventsSectionHeader } from "@/components/events";

type EventsEmptyTableProps = {
  title: string;
  countLabel: string;
  message: string;
};

const EventsEmptyTable = (props: EventsEmptyTableProps) => {
  const { title, countLabel, message } = props;

  return (
    <Card variant="solid" size="md" className="mb-10">
      <EventsSectionHeader className="mb-4" title={title} meta={countLabel} />
      <EmptyState message={message} />
    </Card>
  );
};

export { EventsEmptyTable };
