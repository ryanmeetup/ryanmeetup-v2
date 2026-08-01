"use client";

import Marquee from "react-fast-marquee";
import { LogoCard } from "./LogoCard";
import type { LogoCardProps } from "./LogoCard";

export type LogoMarqueeItem = Omit<LogoCardProps, "className"> & {
  key?: string;
};
export type LogoMarqueeProps = {
  items: LogoMarqueeItem[];
  speed?: number;
  direction?: "left" | "right";
  itemClassName?: string;
  wrapperClassName?: string;
};

const LogoMarquee = ({
  items,
  speed = 50,
  direction = "left",
  itemClassName,
  wrapperClassName,
}: LogoMarqueeProps) => (
  <Marquee
    speed={speed}
    gradient={false}
    direction={direction}
    className={wrapperClassName}
  >
    {items.map(({ key, ...item }, index) => (
      <div key={key ?? `${item.alt}-${index}`} className="py-4">
        <LogoCard {...item} className={itemClassName} />
      </div>
    ))}
  </Marquee>
);

export { LogoMarquee };
