"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";

// Components
import { AnimatedCollapse, Heading } from "@ryanmeetup/ui";
import { FaChevronDown as Chevron } from "react-icons/fa";

type CollapsibleSectionProps = {
  id?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

const CollapsibleSection = (props: CollapsibleSectionProps) => {
  const { id, title, description, children } = props;

  // Every section starts open so the page reads the same as it always has; the
  // toggle is there for visitors who want to skip past one.
  const [open, setOpen] = useState(true);

  // Sections that carry an anchor get a panel id to match, so the pair reads
  // the same in the markup as it does in the anchor nav.
  const generatedId = useId();
  const panelId = `${id ?? generatedId}-panel`;

  return (
    <section id={id}>
      <button
        type="button"
        aria-controls={panelId}
        aria-expanded={open}
        className="mx-auto flex cursor-pointer items-center justify-center gap-3"
        onClick={() => setOpen((current) => !current)}
      >
        <Heading className="text-3xl title sm:text-4xl">{title}</Heading>
        <Chevron
          className={`h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? "-rotate-180" : ""}`}
        />
      </button>

      <AnimatedCollapse id={panelId} open={open}>
        {/* The gap under the heading lives inside the collapse so it folds away
            with the content, leaving a closed section no taller than its
            heading. The padding doubles as room for the award cards, which lift
            and cast a shadow on hover that the collapse would otherwise clip. */}
        <div className={`space-y-6 pb-3 ${description ? "pt-2" : "pt-6"}`}>
          {description && <div className="text-center">{description}</div>}
          {children}
        </div>
      </AnimatedCollapse>
    </section>
  );
};

export { CollapsibleSection };
