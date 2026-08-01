import type { ReactNode } from "react";
import { Heading } from "./Heading";
import { Kicker } from "./Kicker";
import { Text } from "./Text";

export type SectionHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
  headingClassName?: string;
  align?: "left" | "center" | "responsive";
  headingLevel?: "h1" | "h2" | "h3";
};

const SectionHeader = ({
  title,
  description,
  meta,
  actions,
  className,
  headingClassName = "text-3xl title sm:text-4xl",
  align = "responsive",
  headingLevel = "h2",
}: SectionHeaderProps) => {
  const alignment = {
    left: "text-left",
    center: "items-center text-center",
    responsive: "text-center lg:text-left",
  }[align];
  const metaNode =
    typeof meta === "string" || typeof meta === "number" ? (
      <Kicker>{meta}</Kicker>
    ) : (
      meta
    );

  return (
    <div className={`flex flex-col gap-2 ${alignment} ${className ?? ""}`}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <Heading className={headingClassName} size={headingLevel}>
          {title}
        </Heading>
        {(metaNode || actions) && (
          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-end">
            {metaNode}
            {actions}
          </div>
        )}
      </div>
      {description && <Text>{description}</Text>}
    </div>
  );
};

export { SectionHeader };
