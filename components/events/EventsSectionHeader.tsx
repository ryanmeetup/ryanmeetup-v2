// Components
import { Heading, Kicker } from "@/components/global";

// Types
import type { ReactNode } from "react";

type EventsSectionHeaderProps = {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
};

const EventsSectionHeader = (props: EventsSectionHeaderProps) => {
  const { title, meta, action, className } = props;

  if (!meta && !action) {
    return (
      <div className={className ?? ""}>
        <Heading className="text-3xl title lg:text-4xl" size="h2">
          {title}
        </Heading>
      </div>
    );
  }

  const metaNode =
    typeof meta === "string" || typeof meta === "number" ? (
      <Kicker>{meta}</Kicker>
    ) : (
      meta
    );

  return (
    <div
      className={`flex flex-col gap-2 text-center lg:flex-row lg:items-end lg:justify-between lg:text-left ${
        className ?? ""
      }`}
    >
      <Heading className="text-3xl title lg:text-4xl" size="h2">
        {title}
      </Heading>
      <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-end">
        {metaNode}
        {action}
      </div>
    </div>
  );
};

export { EventsSectionHeader };
