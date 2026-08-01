import { SectionHeader } from "@ryanmeetup/ui";
import type { ReactNode } from "react";

type EventsSectionHeaderProps = {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
};

const EventsSectionHeader = ({
  title,
  meta,
  action,
  className,
}: EventsSectionHeaderProps) => (
  <SectionHeader
    title={title}
    meta={meta}
    actions={action}
    className={className}
    headingClassName="text-3xl title lg:text-4xl"
  />
);

export { EventsSectionHeader };
