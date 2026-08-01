// Components
import { Event } from "@/components/events";

// Types
import type { RyanEvent } from "@/lib/types";

// Utilities
import { isEventUpcoming } from "@/utils/date";

type DoubleHeaderProps = {
  events: RyanEvent[];
};

const DoubleHeader = (props: DoubleHeaderProps) => {
  const { events } = props;

  const activeEvents = events?.filter((event) => isEventUpcoming(event.date));

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-4 pt-1 md:mx-24 md:grid-cols-3">
      {activeEvents.map((event, index) => (
        <Event key={index} event={event as RyanEvent} />
      ))}
    </div>
  );
};

export { DoubleHeader };
