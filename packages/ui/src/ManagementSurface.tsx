import type { ReactNode } from "react";
import { Heading } from "./Heading";

export type ManagementSurfaceProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * A full-page management composition with a heading, toolbar, and bordered
 * content area. Unlike `Modal`, this surface has no dialog lifecycle or
 * dismissal behavior.
 */
const ManagementSurface = ({
  title,
  description,
  actions,
  children,
  className,
}: ManagementSurfaceProps) => (
  <section
    className={`overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#181818] ${className ?? ""}`}
  >
    {title && (
      <div className="flex flex-col gap-4 border-b border-black/10 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Heading size="h1" className="text-2xl sm:text-3xl">
            {title}
          </Heading>
          {description && (
            <div className="mt-2 text-sm leading-relaxed text-black/65 dark:text-white/65">
              {description}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            {actions}
          </div>
        )}
      </div>
    )}
    <div className="p-5">{children}</div>
  </section>
);

export { ManagementSurface };
