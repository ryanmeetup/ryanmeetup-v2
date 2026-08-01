import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "./Card";
import { Heading } from "./Heading";
import { Kicker } from "./Kicker";

export type StatCardProps = {
  value: ReactNode;
  label: ReactNode;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

const StatCard = ({ value, label, icon, href, className }: StatCardProps) => {
  const content = (
    <Card
      variant="solid"
      size="sm"
      hover={Boolean(href)}
      className={`h-full text-center ${className ?? ""}`}
    >
      {icon && <div className="mb-2 flex justify-center">{icon}</div>}
      <Heading className="text-3xl font-cooper" size="h3">
        {value}
      </Heading>
      <Kicker>{label}</Kicker>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
};

export type StatGridProps = {
  children: ReactNode;
  className?: string;
};
const StatGrid = ({ children, className }: StatGridProps) => (
  <div className={`grid grid-cols-2 gap-3 lg:grid-cols-3 ${className ?? ""}`}>
    {children}
  </div>
);

export { StatCard, StatGrid };
