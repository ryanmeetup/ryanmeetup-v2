import { useId, type ReactNode } from "react";
import { AnimatedCollapse, Button } from "@ryanmeetup/ui";
import { FiChevronDown } from "react-icons/fi";

export function ExpandableResourceEditor({
  expanded,
  setExpanded,
  primary,
  secondary,
  title = "Supporting details",
  summary = "Notes, attachments, and useful links",
}: {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  primary: ReactNode;
  secondary: ReactNode;
  title?: string;
  summary?: string;
}) {
  const detailsId = useId();
  return (
    <div
      className={
        expanded
          ? "grid items-start transition-[grid-template-columns,gap] duration-300 ease-out motion-reduce:transition-none lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8"
          : "grid items-start transition-[grid-template-columns,gap] duration-300 ease-out motion-reduce:transition-none lg:grid-cols-[minmax(0,1fr)_0fr] lg:gap-0"
      }
    >
      <div
        className={`min-w-0 space-y-4 ${
          expanded ? "lg:sticky lg:top-6" : ""
        }`}
      >
        {primary}
        {!expanded && (
          <button
            type="button"
            aria-expanded="false"
            aria-controls={detailsId}
            className="group flex w-full items-center gap-4 rounded-xl border border-black/15 bg-black/[0.025] p-4 text-left transition hover:border-black/30 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:border-white/15 dark:bg-white/[0.035] dark:hover:border-white/30 dark:hover:bg-white/[0.07] dark:focus-visible:ring-white/30"
            onClick={() => setExpanded(true)}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{title}</span>
              <span className="mt-1 block text-xs text-black/55 dark:text-white/55">
                {summary}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-black/55 dark:text-white/55">
              Show
              <FiChevronDown className="transition-transform group-hover:translate-y-0.5 motion-reduce:transform-none" />
            </span>
          </button>
        )}
      </div>
      <AnimatedCollapse
        id={detailsId}
        open={expanded}
        className={expanded ? "mt-6 min-w-0 lg:mt-0" : "min-w-0"}
        contentClassName="min-w-0 lg:border-l lg:border-black/10 lg:pl-8 lg:dark:border-white/10"
      >
        <div className="mb-5 flex flex-col items-stretch gap-3 border-b border-black/10 pb-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full min-w-0">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-black/55 dark:text-white/55">
              {summary}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full whitespace-nowrap sm:w-auto sm:shrink-0"
            rightIcon={<FiChevronDown className="rotate-180" />}
            aria-expanded="true"
            aria-controls={detailsId}
            onClick={() => setExpanded(false)}
          >
            Hide details
          </Button>
        </div>
        <div className="space-y-4">{secondary}</div>
      </AnimatedCollapse>
    </div>
  );
}
