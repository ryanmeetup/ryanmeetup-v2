import clsx from "clsx";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { Heading, Text } from "@ryanmeetup/ui";

/**
 * The standard top of a workspace screen: an optional kicker, the page icon and
 * title, an optional trailing badge, the one-line description, and any actions
 * that belong beside the title.
 *
 * Every page uses this rather than composing its own heading, so the icon
 * treatment, description tone, and action alignment stay identical across the
 * app and can be changed in one place.
 */
export function PageHeader({
  actions,
  badge,
  className,
  description,
  icon: Icon,
  kicker,
  title,
}: {
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
  description?: ReactNode;
  icon?: IconType;
  kicker?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {kicker && (
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
            {kicker}
          </p>
        )}
        <Heading
          size="h1"
          className={clsx(
            "flex flex-wrap items-center gap-2 text-3xl sm:text-4xl",
            kicker && "mt-2",
          )}
        >
          {/* Muted so the icon labels the page without competing with it. */}
          {Icon && (
            <Icon
              aria-hidden
              className="shrink-0 text-black/40 dark:text-white/40"
            />
          )}
          {title}
          {badge}
        </Heading>
        {description && <Text className="mt-2 text-sm">{description}</Text>}
      </div>
      {actions}
    </div>
  );
}
