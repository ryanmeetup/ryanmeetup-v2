import Link from "next/link";
import type { ReactNode } from "react";
import { Text } from "./Text";

export type Breadcrumb = {
  current?: boolean;
  icon?: ReactNode;
  href: string;
  title: string;
};

export type BreadcrumbsProps = {
  crumbs: Breadcrumb[];
  className?: string;
  variant?: "default" | "compact";
};

const Breadcrumbs = ({
  crumbs,
  className = "",
  variant = "default",
}: BreadcrumbsProps) => {
  const compact = variant === "compact";

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        className={
          compact
            ? "flex flex-wrap items-center gap-2"
            : "mb-2 flex flex-wrap items-center gap-x-4 gap-y-2"
        }
      >
        {crumbs.map((crumb, index) => {
          const current = crumb.current ?? index === crumbs.length - 1;

          return (
            <li
              className={
                compact
                  ? "flex items-center gap-2 text-sm"
                  : "flex items-center gap-4 text-lg"
              }
              key={`${crumb.href}-${crumb.title}`}
            >
              {current && !compact ? (
                <span
                  aria-current="page"
                  className="flex items-center font-semibold text-black dark:text-white"
                >
                  {crumb.icon}
                  <Text className="title text-inherit">{crumb.title}</Text>
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  aria-current={current ? "page" : undefined}
                  className={
                    compact
                      ? "group inline-flex items-center gap-1.5 rounded text-sm font-semibold text-black/60 hover:text-black hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:text-white/60 dark:hover:text-white dark:focus-visible:ring-white/40"
                      : "group flex items-center timing hover:scale-102 hover:underline"
                  }
                >
                  {crumb.icon}
                  <Text
                    className={
                      compact
                        ? "text-inherit"
                        : "text-gray-700 group-hover:text-black dark:text-gray-400 dark:group-hover:text-white"
                    }
                  >
                    {crumb.title}
                  </Text>
                </Link>
              )}

              {index !== crumbs.length - 1 && (
                <span aria-hidden className="text-gray-400">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export { Breadcrumbs };
